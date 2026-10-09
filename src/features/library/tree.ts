import type { CardState, Deck, Folder, Id } from '@/db/types'

export interface ItemStats {
  total: number
  /** Fällige Wiederholungen (ohne neue Karten) */
  due: number
  newCount: number
  /** Karten mit Intervall ≥ 21 Tagen */
  mastered: number
  /** 0–1: Anteil beherrschter Karten */
  progress: number
}

const STATE_NEW = 0
const STATE_REVIEW = 2
export const MASTERED_DAYS = 21

export const EMPTY_STATS: ItemStats = { total: 0, due: 0, newCount: 0, mastered: 0, progress: 0 }

function addStats(a: ItemStats, b: ItemStats): ItemStats {
  const total = a.total + b.total
  const mastered = a.mastered + b.mastered
  return {
    total,
    due: a.due + b.due,
    newCount: a.newCount + b.newCount,
    mastered,
    progress: total === 0 ? 0 : mastered / total,
  }
}

type StateLike = Pick<CardState, 'deckId' | 'due' | 'state' | 'scheduled_days' | 'trashed'>

/** Unveränderliche Sicht auf Ordner, Stapel und Lernstände (ohne Papierkorb-Inhalte). */
export class Library {
  readonly folders = new Map<Id, Folder>()
  readonly decks = new Map<Id, Deck>()
  private readonly childFolders = new Map<Id | null, Folder[]>()
  private readonly childDecks = new Map<Id | null, Deck[]>()
  private readonly deckStats = new Map<Id, ItemStats>()
  private readonly folderStatsCache = new Map<Id, ItemStats>()

  constructor(allFolders: Folder[], allDecks: Deck[], states: StateLike[], now = Date.now()) {
    const byId = new Map(allFolders.map((f) => [f.id, f]))

    // Ein Ordner ist sichtbar, wenn weder er noch ein Vorfahr im Papierkorb liegt.
    const visible = new Map<Id, boolean>()
    const isVisible = (f: Folder, seen = new Set<Id>()): boolean => {
      const cached = visible.get(f.id)
      if (cached !== undefined) return cached
      if (f.deletedAt || seen.has(f.id)) return false
      seen.add(f.id)
      const parent = f.parentId ? byId.get(f.parentId) : undefined
      const result = f.parentId === null ? true : parent ? isVisible(parent, seen) : true
      visible.set(f.id, result)
      return result
    }

    for (const f of allFolders) {
      if (!isVisible(f)) continue
      // Verwaiste Ordner (Eltern fehlen) landen auf oberster Ebene
      const parentId = f.parentId && byId.has(f.parentId) ? f.parentId : null
      const folder = parentId === f.parentId ? f : { ...f, parentId }
      this.folders.set(f.id, folder)
      push(this.childFolders, parentId, folder)
    }

    for (const d of allDecks) {
      if (d.deletedAt) continue
      if (d.folderId !== null && !this.folders.has(d.folderId)) {
        const parent = byId.get(d.folderId)
        if (parent) continue // Ordner liegt im Papierkorb
      }
      const folderId = d.folderId && this.folders.has(d.folderId) ? d.folderId : null
      const deck = folderId === d.folderId ? d : { ...d, folderId }
      this.decks.set(d.id, deck)
      push(this.childDecks, folderId, deck)
    }

    for (const list of this.childFolders.values()) list.sort(byOrder)
    for (const list of this.childDecks.values()) list.sort(byOrder)

    for (const s of states) {
      if (s.trashed || !this.decks.has(s.deckId)) continue
      const prev = this.deckStats.get(s.deckId) ?? EMPTY_STATS
      const isNew = s.state === STATE_NEW
      const mastered = s.state === STATE_REVIEW && s.scheduled_days >= MASTERED_DAYS
      const due = !isNew && new Date(s.due).getTime() <= now
      this.deckStats.set(
        s.deckId,
        addStats(prev, { total: 1, due: due ? 1 : 0, newCount: isNew ? 1 : 0, mastered: mastered ? 1 : 0, progress: 0 }),
      )
    }
  }

  foldersIn(parentId: Id | null): Folder[] {
    return this.childFolders.get(parentId) ?? []
  }

  decksIn(folderId: Id | null): Deck[] {
    return this.childDecks.get(folderId) ?? []
  }

  /** Pfad von der obersten Ebene bis einschließlich `folderId` */
  path(folderId: Id | null): Folder[] {
    const result: Folder[] = []
    let current = folderId ? this.folders.get(folderId) : undefined
    const seen = new Set<Id>()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      result.unshift(current)
      current = current.parentId ? this.folders.get(current.parentId) : undefined
    }
    return result
  }

  /** Alle Ordner-IDs unterhalb von `folderId`, inklusive sich selbst */
  descendantFolderIds(folderId: Id): Id[] {
    const result: Id[] = []
    const stack = [folderId]
    while (stack.length) {
      const id = stack.pop()!
      result.push(id)
      for (const child of this.foldersIn(id)) stack.push(child.id)
    }
    return result
  }

  /** Alle Stapel in einem Ordner inklusive Unterordnern */
  descendantDeckIds(folderId: Id): Id[] {
    return this.descendantFolderIds(folderId).flatMap((id) => this.decksIn(id).map((d) => d.id))
  }

  /** Ein Ordner darf nicht in sich selbst oder einen seiner Unterordner verschoben werden. */
  canMoveFolder(folderId: Id, targetParentId: Id | null): boolean {
    if (targetParentId === null) return true
    return !this.descendantFolderIds(folderId).includes(targetParentId)
  }

  statsForDeck(deckId: Id): ItemStats {
    return this.deckStats.get(deckId) ?? EMPTY_STATS
  }

  statsForFolder(folderId: Id): ItemStats {
    const cached = this.folderStatsCache.get(folderId)
    if (cached) return cached
    const stats = this.descendantDeckIds(folderId).reduce((acc, id) => addStats(acc, this.statsForDeck(id)), EMPTY_STATS)
    this.folderStatsCache.set(folderId, stats)
    return stats
  }

  totalStats(): ItemStats {
    let acc = EMPTY_STATS
    for (const id of this.decks.keys()) acc = addStats(acc, this.statsForDeck(id))
    return acc
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function byOrder(a: { order: number; name: string }, b: { order: number; name: string }) {
  return a.order - b.order || a.name.localeCompare(b.name, 'de')
}
