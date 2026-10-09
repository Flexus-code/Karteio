import { db } from '@/db/db'
import type { Card, CardState, Deck, Folder, Id, KeyValue, Media, Review } from '@/db/types'
import { syncStates } from '@/features/cards/repo'
import { newId } from '@/lib/id'
import { useSettings, type LearningSettings } from '@/store/settings'
import { useUiStore } from '@/store/ui'

export const FORMAT_VERSION = 1

interface MediaJson {
  id: Id
  mimeType: string
  createdAt: number
  data: string
}

export interface BackupFile {
  app: 'karteio'
  type: 'backup'
  version: number
  exportedAt: number
  settings: { learning: Partial<LearningSettings>; ui: { theme: string; accent: string } }
  data: { folders: Folder[]; decks: Deck[]; cards: Card[]; cardStates: CardState[]; reviews: Review[]; kv: KeyValue[] }
  media: MediaJson[]
}

/** Ordner/Stapel zum Teilen – ohne Lernfortschritt */
export interface SharePackage {
  app: 'karteio'
  type: 'share'
  version: number
  exportedAt: number
  name: string
  folders: Folder[]
  decks: Deck[]
  cards: Card[]
  media: MediaJson[]
}

// ---------- Base64 ----------

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

async function mediaToJson(list: Media[]): Promise<MediaJson[]> {
  return Promise.all(list.map(async (m) => ({ id: m.id, mimeType: m.mimeType, createdAt: m.createdAt, data: await blobToBase64(m.blob) })))
}

function mediaFromJson(list: MediaJson[]): Media[] {
  return list.map((m) => ({ id: m.id, mimeType: m.mimeType, createdAt: m.createdAt, blob: base64ToBlob(m.data, m.mimeType) }))
}

/** JSON macht aus Datumswerten Texte – für Lernstände wieder echte Daten herstellen */
function reviveState(s: CardState): CardState {
  return { ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined }
}

// ---------- Vollständiges Backup ----------

/** Einstellungen ohne Funktionen und ohne geheime Werte (z. B. API-Schlüssel) */
function exportableSettings(): Partial<LearningSettings> {
  const entries = Object.entries(useSettings.getState()).filter(([k, v]) => typeof v !== 'function' && !/key|secret|token/i.test(k))
  return Object.fromEntries(entries) as Partial<LearningSettings>
}

export async function createBackup(): Promise<BackupFile> {
  const [folders, decks, cards, cardStates, reviews, kv, media] = await Promise.all([
    db.folders.toArray(),
    db.decks.toArray(),
    db.cards.toArray(),
    db.cardStates.toArray(),
    db.reviews.toArray(),
    db.kv.toArray(),
    db.media.toArray(),
  ])
  const ui = useUiStore.getState()
  return {
    app: 'karteio',
    type: 'backup',
    version: FORMAT_VERSION,
    exportedAt: Date.now(),
    settings: { learning: exportableSettings(), ui: { theme: ui.theme, accent: ui.accent } },
    data: { folders, decks, cards, cardStates, reviews, kv: kv.filter((k) => !/key|secret|token/i.test(k.key)) },
    media: await mediaToJson(media),
  }
}

const TABLES = () => [db.folders, db.decks, db.cards, db.cardStates, db.reviews, db.kv, db.media]

/**
 * Stellt ein Backup wieder her.
 * `replace`: vorhandene Daten werden vollständig ersetzt. `merge`: Einträge aus dem Backup werden ergänzt bzw. überschrieben.
 */
export async function restoreBackup(file: BackupFile, mode: 'replace' | 'merge') {
  const { data } = file
  const media = mediaFromJson(file.media)
  await db.transaction('rw', TABLES(), async () => {
    if (mode === 'replace') await Promise.all(TABLES().map((t) => t.clear()))
    await db.folders.bulkPut(data.folders)
    await db.decks.bulkPut(data.decks)
    await db.cards.bulkPut(data.cards)
    await db.cardStates.bulkPut(data.cardStates.map(reviveState))
    await db.reviews.bulkPut(data.reviews)
    await db.kv.bulkPut(data.kv)
    await db.media.bulkPut(media)
  })
  if (mode === 'replace') {
    useSettings.getState().update(file.settings.learning)
    const ui = useUiStore.getState()
    const accent = file.settings.ui.accent as Parameters<typeof ui.setAccent>[0]
    const theme = file.settings.ui.theme as Parameters<typeof ui.setTheme>[0]
    if (accent) ui.setAccent(accent)
    if (theme) ui.setTheme(theme)
  }
}

// ---------- Teilen von Ordnern / Stapeln ----------

export async function createSharePackage(scope: { kind: 'folder' | 'deck'; id: Id }): Promise<SharePackage> {
  let folders: Folder[] = []
  let decks: Deck[] = []
  let name = ''

  if (scope.kind === 'deck') {
    const deck = await db.decks.get(scope.id)
    if (!deck) throw new Error('Stapel nicht gefunden')
    decks = [{ ...deck, folderId: null }]
    name = deck.name
  } else {
    const all = (await db.folders.toArray()).filter((f) => !f.deletedAt)
    const root = all.find((f) => f.id === scope.id)
    if (!root) throw new Error('Ordner nicht gefunden')
    name = root.name
    const ids = new Set([root.id])
    let grew = true
    while (grew) {
      grew = false
      for (const f of all) if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) (ids.add(f.id), (grew = true))
    }
    folders = all.filter((f) => ids.has(f.id)).map((f) => (f.id === root.id ? { ...f, parentId: null } : f))
    decks = (await db.decks.where('folderId').anyOf([...ids]).toArray()).filter((d) => !d.deletedAt)
  }

  const cards = (await db.cards.where('deckId').anyOf(decks.map((d) => d.id)).toArray())
    .filter((c) => !c.deletedAt)
    .map((c) => ({ ...c, flagged: false, suspended: false }))
  const media = (await db.media.bulkGet(cards.flatMap((c) => c.mediaIds))).filter((m): m is Media => Boolean(m))

  return { app: 'karteio', type: 'share', version: FORMAT_VERSION, exportedAt: Date.now(), name, folders, decks, cards, media: await mediaToJson(media) }
}

/** Importiert ein geteiltes Paket mit neuen IDs (Duplikate bei mehrfachem Import sind gewollt möglich). */
export async function importSharePackage(pkg: SharePackage, targetFolderId: Id | null) {
  const map = new Map<string, string>()
  const remap = (id: string) => {
    if (!map.has(id)) map.set(id, newId())
    return map.get(id)!
  }
  const now = Date.now()

  const folders = pkg.folders.map((f) => ({ ...f, id: remap(f.id), parentId: f.parentId ? remap(f.parentId) : targetFolderId, createdAt: now, updatedAt: now, deletedAt: undefined }))
  const decks = pkg.decks.map((d) => ({
    ...d,
    id: remap(d.id),
    folderId: d.folderId && pkg.folders.some((f) => f.id === d.folderId) ? remap(d.folderId) : targetFolderId,
    createdAt: now,
    updatedAt: now,
    deletedAt: undefined,
  }))
  const media = mediaFromJson(pkg.media).map((m) => ({ ...m, id: remap(m.id) }))
  const cards: Card[] = pkg.cards.map((c, i) => {
    let json = JSON.stringify({ front: c.front, back: c.back })
    for (const old of c.mediaIds) json = json.replaceAll(`"${old}"`, `"${remap(old)}"`)
    const { front, back } = JSON.parse(json) as Pick<Card, 'front' | 'back'>
    return { ...c, id: remap(c.id), deckId: remap(c.deckId), front, back, mediaIds: c.mediaIds.map(remap), createdAt: now + i, updatedAt: now, deletedAt: undefined, flagged: false, suspended: false }
  })

  // Neue Ordner ans Ende der Zielebene sortieren
  const siblings = await db.folders.filter((f) => f.parentId === targetFolderId && !f.deletedAt).toArray()
  const maxOrder = siblings.reduce((m, f) => Math.max(m, f.order), -1)
  folders.forEach((f) => f.parentId === targetFolderId && (f.order = maxOrder + 1 + f.order))

  await db.transaction('rw', [db.folders, db.decks, db.cards, db.cardStates, db.media], async () => {
    await db.folders.bulkAdd(folders)
    await db.decks.bulkAdd(decks)
    await db.media.bulkAdd(media)
    await db.cards.bulkAdd(cards)
    for (const c of cards) await syncStates(c)
  })
  return { folders: folders.length, decks: decks.length, cards: cards.length, rootFolderId: folders.find((f) => f.parentId === targetFolderId)?.id, rootDeckId: decks[0]?.id }
}

// ---------- Dateien erkennen ----------

export type KarteioFile = { kind: 'backup'; file: BackupFile } | { kind: 'share'; file: SharePackage }

export function parseKarteioFile(text: string): KarteioFile | null {
  try {
    const json = JSON.parse(text) as { app?: string; type?: string }
    if (json.app !== 'karteio') return null
    if (json.type === 'backup') return { kind: 'backup', file: json as BackupFile }
    if (json.type === 'share') return { kind: 'share', file: json as SharePackage }
    return null
  } catch {
    return null
  }
}

// ---------- Backup-Erinnerung ----------

const LAST_BACKUP = 'karteio-last-backup'

export function lastBackupAt(): number | null {
  const v = Number(localStorage.getItem(LAST_BACKUP))
  return v > 0 ? v : null
}

export function markBackupDone() {
  localStorage.setItem(LAST_BACKUP, String(Date.now()))
}
