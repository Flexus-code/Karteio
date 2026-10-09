import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { emptyDraft } from '@/features/cards/model'
import { createCard } from '@/features/cards/repo'
import { textToDoc } from '@/features/cards/richtext'
import { createDeck, createFolder } from '@/features/library/repo'
import { base64ToBlob, blobToBase64, createBackup, createSharePackage, importSharePackage, parseKarteioFile, restoreBackup } from './backup'

// localStorage für zustand (Node hat keins)
const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
} as Storage

async function seed() {
  const folder = await createFolder({ name: 'IHK', color: 'green', icon: '🎓', parentId: null })
  const sub = await createFolder({ name: 'Netze', color: 'blue', icon: '🌐', parentId: folder.id })
  const deck = await createDeck({ name: 'OSI', description: '', color: 'blue', icon: '🗂️', folderId: sub.id })
  const mediaId = 'bild-1'
  await db.media.add({ id: mediaId, blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), mimeType: 'image/jpeg', createdAt: 1 })
  const card = await createCard(deck.id, {
    ...emptyDraft('basic'),
    front: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Schicht 3?' }] }, { type: 'image', attrs: { mediaId } }] },
    back: textToDoc('Vermittlung'),
  })
  await createCard(deck.id, { ...emptyDraft('reversible'), front: textToDoc('A'), back: textToDoc('B') })
  return { folder, sub, deck, card }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('Base64', () => {
  it('überträgt Binärdaten verlustfrei', async () => {
    const blob = new Blob([new Uint8Array([0, 255, 128, 7])], { type: 'image/png' })
    const back = base64ToBlob(await blobToBase64(blob), 'image/png')
    expect([...new Uint8Array(await back.arrayBuffer())]).toEqual([0, 255, 128, 7])
  })
})

describe('Backup', () => {
  it('sichert alles und stellt es vollständig wieder her', async () => {
    await seed()
    const backup = parseKarteioFile(JSON.stringify(await createBackup()))
    expect(backup?.kind).toBe('backup')

    await Promise.all(db.tables.map((t) => t.clear()))
    await restoreBackup(backup!.file as never, 'replace')

    expect(await db.folders.count()).toBe(2)
    expect(await db.cards.count()).toBe(2)
    expect(await db.cardStates.count()).toBe(3)
    expect(await db.media.count()).toBe(1)
    const state = (await db.cardStates.toArray())[0]!
    expect(state.due).toBeInstanceOf(Date)
  })

  it('ersetzt beim Wiederherstellen vorhandene Daten', async () => {
    await seed()
    const backup = await createBackup()
    await createFolder({ name: 'Nach dem Backup', color: 'rose', icon: '📁', parentId: null })
    await restoreBackup(JSON.parse(JSON.stringify(backup)), 'replace')
    expect((await db.folders.toArray()).map((f) => f.name).sort()).toEqual(['IHK', 'Netze'])
  })
})

describe('Teilen', () => {
  it('exportiert einen Ordner samt Unterordnern und importiert ihn mit neuen IDs', async () => {
    const { folder } = await seed()
    const pkg = JSON.parse(JSON.stringify(await createSharePackage({ kind: 'folder', id: folder.id })))
    expect(pkg.folders).toHaveLength(2)
    expect(pkg.cards).toHaveLength(2)
    expect(pkg.media).toHaveLength(1)

    const result = await importSharePackage(pkg, null)
    expect(result).toMatchObject({ folders: 2, decks: 1, cards: 2 })
    expect(await db.folders.count()).toBe(4)
    expect(await db.cards.count()).toBe(4)
    expect(await db.cardStates.count()).toBe(6)

    // Bildverweise zeigen auf die neue Kopie
    const imported = (await db.cards.toArray()).filter((c) => c.mediaIds.length && c.mediaIds[0] !== 'bild-1')
    expect(imported).toHaveLength(1)
    expect(JSON.stringify(imported[0]!.front)).toContain(imported[0]!.mediaIds[0]!)
    expect(await db.media.get(imported[0]!.mediaIds[0]!)).toBeDefined()
  })

  it('erkennt fremde Dateien nicht als Karteio-Datei', () => {
    expect(parseKarteioFile('{"app":"anki"}')).toBeNull()
    expect(parseKarteioFile('kein json')).toBeNull()
  })
})
