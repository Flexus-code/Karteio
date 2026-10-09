import { describe, expect, it } from 'vitest'
import type { CardState, Deck, Folder } from '@/db/types'
import { Library } from './tree'

const NOW = new Date('2026-10-09T12:00:00Z').getTime()

function folder(id: string, parentId: string | null, extra: Partial<Folder> = {}): Folder {
  return { id, parentId, name: id, color: 'indigo', icon: '📁', order: 0, createdAt: 0, updatedAt: 0, ...extra }
}
function deck(id: string, folderId: string | null, extra: Partial<Deck> = {}): Deck {
  return { id, folderId, name: id, description: '', color: 'blue', icon: '🗂️', order: 0, createdAt: 0, updatedAt: 0, ...extra }
}
type S = Pick<CardState, 'deckId' | 'due' | 'state' | 'scheduled_days' | 'trashed'>
function state(deckId: string, extra: Partial<S> = {}): S {
  return { deckId, due: new Date(NOW + 86_400_000), state: 0, scheduled_days: 0, trashed: 0, ...extra }
}

describe('Library', () => {
  const folders = [folder('a', null), folder('b', 'a'), folder('c', 'b'), folder('x', null, { order: -1 })]
  const decks = [deck('d1', 'a'), deck('d2', 'c'), deck('root', null)]

  it('sortiert Kinder nach order', () => {
    const lib = new Library(folders, decks, [], NOW)
    expect(lib.foldersIn(null).map((f) => f.id)).toEqual(['x', 'a'])
    expect(lib.decksIn(null).map((d) => d.id)).toEqual(['root'])
  })

  it('liefert den Pfad bis zum Ordner', () => {
    const lib = new Library(folders, decks, [], NOW)
    expect(lib.path('c').map((f) => f.id)).toEqual(['a', 'b', 'c'])
    expect(lib.path(null)).toEqual([])
  })

  it('verhindert Verschieben in eigene Unterordner', () => {
    const lib = new Library(folders, decks, [], NOW)
    expect(lib.canMoveFolder('a', 'c')).toBe(false)
    expect(lib.canMoveFolder('a', 'a')).toBe(false)
    expect(lib.canMoveFolder('c', 'a')).toBe(true)
    expect(lib.canMoveFolder('b', null)).toBe(true)
  })

  it('blendet gelöschte Ordner samt Inhalt aus', () => {
    const lib = new Library([...folders.slice(0, 1), folder('b', 'a', { deletedAt: 1 }), folders[2]!], decks, [], NOW)
    expect(lib.folders.has('b')).toBe(false)
    expect(lib.folders.has('c')).toBe(false)
    expect(lib.decks.has('d2')).toBe(false)
    expect(lib.decks.has('d1')).toBe(true)
  })

  it('hängt verwaiste Ordner an die oberste Ebene', () => {
    const lib = new Library([folder('o', 'missing')], [], [], NOW)
    expect(lib.foldersIn(null).map((f) => f.id)).toEqual(['o'])
  })

  it('aggregiert Statistiken über Unterordner', () => {
    const states = [
      state('d1'), // neu
      state('d2', { state: 2, due: new Date(NOW - 1000), scheduled_days: 3 }), // fällig
      state('d2', { state: 2, scheduled_days: 30 }), // beherrscht
      state('d2', { trashed: 1 }), // ignoriert
    ]
    const lib = new Library(folders, decks, states, NOW)
    expect(lib.statsForDeck('d2')).toMatchObject({ total: 2, due: 1, mastered: 1, newCount: 0, progress: 0.5 })
    expect(lib.statsForFolder('a')).toMatchObject({ total: 3, due: 1, newCount: 1, mastered: 1 })
    expect(lib.statsForFolder('x').total).toBe(0)
    expect(lib.totalStats().total).toBe(3)
  })
})
