import { db } from '@/db/db'
import type { Deck, Folder, Id, ItemColor } from '@/db/types'
import { newId } from '@/lib/id'

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export interface FolderInput {
  name: string
  color: ItemColor
  icon: string
  parentId: Id | null
}

export interface DeckInput {
  name: string
  description: string
  color: ItemColor
  icon: string
  folderId: Id | null
}

async function nextFolderOrder(parentId: Id | null) {
  const siblings = await db.folders.filter((f) => f.parentId === parentId && !f.deletedAt).toArray()
  return siblings.reduce((max, f) => Math.max(max, f.order), -1) + 1
}

async function nextDeckOrder(folderId: Id | null) {
  const siblings = await db.decks.filter((d) => d.folderId === folderId && !d.deletedAt).toArray()
  return siblings.reduce((max, d) => Math.max(max, d.order), -1) + 1
}

// ---------- Ordner ----------

export async function createFolder(input: FolderInput): Promise<Folder> {
  const now = Date.now()
  const folder: Folder = { id: newId(), ...input, name: input.name.trim(), order: await nextFolderOrder(input.parentId), createdAt: now, updatedAt: now }
  await db.folders.add(folder)
  return folder
}

export async function updateFolder(id: Id, patch: Partial<Omit<FolderInput, 'parentId'>>) {
  await db.folders.update(id, { ...patch, ...(patch.name ? { name: patch.name.trim() } : {}), updatedAt: Date.now() })
}

export async function moveFolder(id: Id, parentId: Id | null) {
  await db.folders.update(id, { parentId, order: await nextFolderOrder(parentId), updatedAt: Date.now() })
}

export async function trashFolder(id: Id) {
  await db.folders.update(id, { deletedAt: Date.now() })
}

export async function restoreFolder(id: Id) {
  await db.transaction('rw', db.folders, async () => {
    const folder = await db.folders.get(id)
    if (!folder) return
    const parent = folder.parentId ? await db.folders.get(folder.parentId) : undefined
    // Liegt der Elternordner noch im Papierkorb, wird auf oberster Ebene wiederhergestellt
    const parentId = parent && !parent.deletedAt ? folder.parentId : null
    await db.folders.update(id, { deletedAt: undefined, parentId, updatedAt: Date.now() })
  })
}

// ---------- Stapel ----------

export async function createDeck(input: DeckInput): Promise<Deck> {
  const now = Date.now()
  const deck: Deck = {
    id: newId(),
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    order: await nextDeckOrder(input.folderId),
    createdAt: now,
    updatedAt: now,
  }
  await db.decks.add(deck)
  return deck
}

export async function updateDeck(id: Id, patch: Partial<Omit<DeckInput, 'folderId'>>) {
  await db.decks.update(id, {
    ...patch,
    ...(patch.name ? { name: patch.name.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    updatedAt: Date.now(),
  })
}

export async function moveDeck(id: Id, folderId: Id | null) {
  await db.decks.update(id, { folderId, order: await nextDeckOrder(folderId), updatedAt: Date.now() })
}

export async function trashDeck(id: Id) {
  await db.decks.update(id, { deletedAt: Date.now() })
}

export async function restoreDeck(id: Id) {
  await db.transaction('rw', db.decks, db.folders, async () => {
    const deck = await db.decks.get(id)
    if (!deck) return
    const folder = deck.folderId ? await db.folders.get(deck.folderId) : undefined
    const folderId = folder && !folder.deletedAt ? deck.folderId : null
    await db.decks.update(id, { deletedAt: undefined, folderId, updatedAt: Date.now() })
  })
}

// ---------- Sortierung ----------

export async function reorderFolders(ids: Id[]) {
  await db.transaction('rw', db.folders, () => Promise.all(ids.map((id, order) => db.folders.update(id, { order }))))
}

export async function reorderDecks(ids: Id[]) {
  await db.transaction('rw', db.decks, () => Promise.all(ids.map((id, order) => db.decks.update(id, { order }))))
}

// ---------- Endgültiges Löschen ----------

/** Löscht Stapel samt Karten, Lernständen, Verlauf und Medien endgültig. */
async function hardDeleteDecks(deckIds: Id[]) {
  if (deckIds.length === 0) return
  const cards = await db.cards.where('deckId').anyOf(deckIds).toArray()
  const mediaIds = cards.flatMap((c) => c.mediaIds)
  await db.cards.bulkDelete(cards.map((c) => c.id))
  await db.cardStates.where('deckId').anyOf(deckIds).delete()
  await db.reviews.where('deckId').anyOf(deckIds).delete()
  await db.media.bulkDelete(mediaIds)
  await db.decks.bulkDelete(deckIds)
}

async function hardDeleteFolder(folderId: Id) {
  const all = await db.folders.toArray()
  const ids = new Set([folderId])
  let grew = true
  while (grew) {
    grew = false
    for (const f of all) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        grew = true
      }
    }
  }
  const decks = await db.decks.where('folderId').anyOf([...ids]).primaryKeys()
  await hardDeleteDecks(decks)
  await db.folders.bulkDelete([...ids])
}

const ALL_TABLES = () => [db.folders, db.decks, db.cards, db.cardStates, db.reviews, db.media]

export async function deleteFolderForever(id: Id) {
  await db.transaction('rw', ALL_TABLES(), () => hardDeleteFolder(id))
}

export async function deleteDeckForever(id: Id) {
  await db.transaction('rw', ALL_TABLES(), () => hardDeleteDecks([id]))
}

/** Entfernt Papierkorb-Einträge, die älter als 30 Tage sind. */
export async function purgeExpiredTrash(now = Date.now()) {
  const limit = now - TRASH_RETENTION_MS
  await db.transaction('rw', ALL_TABLES(), async () => {
    const folders = await db.folders.where('deletedAt').below(limit).primaryKeys()
    for (const id of folders) await hardDeleteFolder(id)
    const decks = await db.decks.where('deletedAt').below(limit).primaryKeys()
    await hardDeleteDecks(decks)
  })
}
