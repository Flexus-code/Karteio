import { createEmptyCard } from 'ts-fsrs'
import { db } from '@/db/db'
import type { Card, CardState, Id } from '@/db/types'
import { newId } from '@/lib/id'
import { normalizeDraft, stateIdsFor, type CardDraft } from './model'
import { collectMediaIds } from './richtext'

function mediaOf(d: CardDraft) {
  return [...new Set([...collectMediaIds(d.front), ...collectMediaIds(d.back)])]
}

/** Legt fehlende Lernstände an und entfernt nicht mehr benötigte (z. B. gelöschte Lücken). */
export async function syncStates(card: Card) {
  const wanted = stateIdsFor(card)
  const existing = await db.cardStates.where('cardId').equals(card.id).toArray()
  const obsolete = existing.filter((s) => !wanted.includes(s.id)).map((s) => s.id)
  const known = new Set(existing.map((s) => s.id))
  const now = new Date()
  const fresh: CardState[] = wanted
    .filter((id) => !known.has(id))
    .map((id) => ({ ...createEmptyCard(now), id, cardId: card.id, deckId: card.deckId, trashed: card.deletedAt ? 1 : 0 }))
  await db.cardStates.bulkDelete(obsolete)
  await db.cardStates.bulkAdd(fresh)
  await db.cardStates.where('cardId').equals(card.id).modify({ deckId: card.deckId, trashed: card.deletedAt ? 1 : 0 })
}

const TABLES = () => [db.cards, db.cardStates, db.media]

export async function createCard(deckId: Id, draft: CardDraft): Promise<Card> {
  const d = normalizeDraft(draft)
  const now = Date.now()
  const card: Card = {
    id: newId(),
    deckId,
    type: d.type,
    front: d.front,
    back: d.back,
    hint: d.hint || undefined,
    notes: d.notes || undefined,
    choices: d.type === 'choice' ? d.choices : undefined,
    tags: d.tags,
    mediaIds: mediaOf(d),
    flagged: false,
    suspended: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', TABLES(), async () => {
    await db.cards.add(card)
    await syncStates(card)
  })
  return card
}

export async function updateCard(id: Id, draft: CardDraft) {
  const d = normalizeDraft(draft)
  await db.transaction('rw', TABLES(), async () => {
    const old = await db.cards.get(id)
    if (!old) return
    const mediaIds = mediaOf(d)
    const card: Card = {
      ...old,
      type: d.type,
      front: d.front,
      back: d.back,
      hint: d.hint || undefined,
      notes: d.notes || undefined,
      choices: d.type === 'choice' ? d.choices : undefined,
      tags: d.tags,
      mediaIds,
      updatedAt: Date.now(),
    }
    await db.cards.put(card)
    await syncStates(card)
    // Entfernte Bilder löschen
    await db.media.bulkDelete(old.mediaIds.filter((m) => !mediaIds.includes(m)))
  })
}

export async function duplicateCard(id: Id): Promise<Card | undefined> {
  const card = await db.cards.get(id)
  if (!card) return
  // Bilder werden mitkopiert, damit Original und Kopie unabhängig bleiben
  const copyMedia = async (doc: Card['front']) => {
    let json = JSON.stringify(doc)
    for (const mediaId of collectMediaIds(doc)) {
      const m = await db.media.get(mediaId)
      if (!m) continue
      const copyId = newId()
      await db.media.add({ ...m, id: copyId, createdAt: Date.now() })
      json = json.replaceAll(`"${mediaId}"`, `"${copyId}"`)
    }
    return JSON.parse(json) as Card['front']
  }
  return db.transaction('rw', TABLES(), async () =>
    createCard(card.deckId, {
      type: card.type,
      front: await copyMedia(card.front),
      back: await copyMedia(card.back),
      choices: card.choices ?? [],
      hint: card.hint ?? '',
      notes: card.notes ?? '',
      tags: card.tags,
    }),
  )
}

/** Löscht Karten endgültig – samt Lernständen, Verlauf und Bildern. */
export async function deleteCardsForever(ids: Id[]) {
  await db.transaction('rw', db.cards, db.cardStates, db.reviews, db.media, async () => {
    const cards = await db.cards.bulkGet(ids)
    await db.media.bulkDelete(cards.flatMap((c) => c?.mediaIds ?? []))
    await db.cardStates.where('cardId').anyOf(ids).delete()
    await db.reviews.where('cardId').anyOf(ids).delete()
    await db.cards.bulkDelete(ids)
  })
}

export async function trashCards(ids: Id[]) {
  const now = Date.now()
  await db.transaction('rw', db.cards, db.cardStates, async () => {
    await db.cards.where('id').anyOf(ids).modify((c) => {
      c.deletedAt = now
    })
    await db.cardStates.where('cardId').anyOf(ids).modify({ trashed: 1 })
  })
}

export async function restoreCards(ids: Id[]) {
  await db.transaction('rw', db.cards, db.cardStates, async () => {
    await db.cards.where('id').anyOf(ids).modify((c) => {
      delete c.deletedAt
    })
    await db.cardStates.where('cardId').anyOf(ids).modify({ trashed: 0 })
  })
}

export async function moveCards(ids: Id[], deckId: Id) {
  await db.transaction('rw', db.cards, db.cardStates, async () => {
    await db.cards.where('id').anyOf(ids).modify((c) => {
      c.deckId = deckId
      c.updatedAt = Date.now()
    })
    await db.cardStates.where('cardId').anyOf(ids).modify({ deckId })
  })
}

export async function setFlagged(ids: Id[], flagged: boolean) {
  await db.cards.where('id').anyOf(ids).modify((c) => {
    c.flagged = flagged
  })
}

export async function setSuspended(ids: Id[], suspended: boolean) {
  await db.cards.where('id').anyOf(ids).modify((c) => {
    c.suspended = suspended
  })
}

export async function addTags(ids: Id[], tags: string[]) {
  await db.cards
    .where('id')
    .anyOf(ids)
    .modify((c) => {
      c.tags = [...new Set([...c.tags, ...tags])]
    })
}

export async function allTags(): Promise<string[]> {
  const keys = await db.cards.orderBy('tags').uniqueKeys()
  return (keys as string[]).sort((a, b) => a.localeCompare(b, 'de'))
}

/** Löscht Bilder, die keiner Karte mehr gehören (z. B. aus verworfenen Entwürfen) und älter als 2 Tage sind. */
export async function collectOrphanMedia(now = Date.now()) {
  const limit = now - 2 * 24 * 60 * 60 * 1000
  const candidates = await db.media.filter((m) => m.createdAt < limit).primaryKeys()
  if (candidates.length === 0) return
  const used = new Set((await db.cards.toArray()).flatMap((c) => c.mediaIds))
  // Entwürfe im Browser-Speicher nicht vergessen
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('karteio-draft:')) {
      for (const m of (localStorage.getItem(key) ?? '').matchAll(/"mediaId":"([^"]+)"/g)) used.add(m[1]!)
    }
  }
  await db.media.bulkDelete(candidates.filter((id) => !used.has(id)))
}
