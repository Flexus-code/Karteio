import { create } from 'zustand'
import { db } from '@/db/db'
import type { CardState, Id, Rating, Review } from '@/db/types'
import { Library } from '@/features/library/tree'
import { newId } from '@/lib/id'
import { useSettings } from '@/store/settings'
import { expectedAnswer } from './answer'
import { createScheduler, nextState } from './scheduler'
import { selectItems } from './select'
import { DEFAULT_CONFIG, type SessionItem, type StudyConfig } from './types'

export interface SessionResult {
  key: string
  stateId: string
  cardId: Id
  rating: Rating
  correct: boolean
  durationMs: number
}

interface UndoEntry {
  item: SessionItem
  before?: CardState
  reviewId: string
  requeuedKey?: string
}

interface SessionState {
  config: StudyConfig | null
  queue: SessionItem[]
  position: number
  results: SessionResult[]
  undo: UndoEntry[]
  startedAt: number
  shownAt: number
  /** Ende der Prüfungszeit (nur Prüfung) */
  endsAt: number | null
  finished: boolean
  /** Antworttexte aller Karten im Bereich (Ablenker fürs Quiz) */
  pool: string[]
  busy: boolean
}

const INITIAL: SessionState = {
  config: null,
  queue: [],
  position: 0,
  results: [],
  undo: [],
  startedAt: 0,
  shownAt: 0,
  endsAt: null,
  finished: false,
  pool: [],
  busy: false,
}

export const useSession = create<SessionState>()(() => INITIAL)

function startOfDay(now = new Date()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Stapel im gewählten Bereich */
export async function resolveDeckIds(config: StudyConfig): Promise<Set<Id>> {
  const [folders, decks] = await Promise.all([db.folders.toArray(), db.decks.toArray()])
  const lib = new Library(folders, decks, [])
  const { scope } = config
  if (scope.kind === 'deck') return new Set(lib.decks.has(scope.id) ? [scope.id] : [])
  if (scope.kind === 'folder') return new Set(lib.folders.has(scope.id) ? lib.descendantDeckIds(scope.id) : [])
  return new Set(lib.decks.keys())
}

/** Ermittelt die Abfragen für eine Konfiguration (ohne die Sitzung zu starten). */
export async function buildItems(config: StudyConfig): Promise<{ items: SessionItem[]; pool: string[] }> {
  const deckIds = await resolveDeckIds(config)
  const ids = [...deckIds]
  const [states, cards] = await Promise.all([
    db.cardStates.where('deckId').anyOf(ids).toArray(),
    db.cards.where('deckId').anyOf(ids).toArray(),
  ])
  const { dailyNewLimit, dailyReviewLimit } = useSettings.getState()
  const today = await db.reviews.where('reviewedAt').aboveOrEqual(startOfDay()).filter((r) => r.mode === 'srs').toArray()
  const newToday = new Set(today.filter((r) => r.wasNew).map((r) => r.cardStateId)).size
  const reviewsToday = new Set(today.filter((r) => !r.wasNew).map((r) => r.cardStateId)).size
  const items = selectItems({
    config,
    states,
    cards: new Map(cards.map((c) => [c.id, c])),
    deckIds,
    newLeft: dailyNewLimit - newToday,
    reviewLeft: dailyReviewLimit - reviewsToday,
  })
  const pool = cards.filter((c) => !c.deletedAt).map((c) => expectedAnswer(c, { reverse: false, cloze: null })).filter(Boolean)
  return { items, pool }
}

/** Startet eine Sitzung. Mit `explicitItems` (z. B. „Fehler nochmal lernen“) wird die Auswahl übersprungen. */
export async function startSession(config: StudyConfig, explicitItems?: SessionItem[]): Promise<number> {
  const built = await buildItems(config)
  const items = explicitItems ?? built.items
  const now = Date.now()
  useSession.setState({
    ...INITIAL,
    config,
    queue: items,
    pool: built.pool,
    startedAt: now,
    shownAt: now,
    endsAt: config.mode === 'exam' ? now + config.examMinutes * 60_000 : null,
    finished: items.length === 0,
  })
  return items.length
}

/** Speichert eine Bewertung, plant die Karte neu (nur Spaced Repetition) und geht weiter. */
export async function answer(rating: Rating, correct = rating >= 3) {
  const s = useSession.getState()
  const item = s.queue[s.position]
  if (!item || !s.config || s.busy || s.finished) return
  useSession.setState({ busy: true })

  try {
    const now = new Date()
    const mode = s.config.mode
    const durationMs = Math.min(now.getTime() - s.shownAt, 5 * 60_000)
    const before = await db.cardStates.get(item.stateId)
    let after: CardState | undefined

    if (mode === 'srs' && before) {
      after = nextState(createScheduler(useSettings.getState().retention), before, rating, now)
      await db.cardStates.put(after)
    }

    const review: Review = {
      id: newId(),
      cardStateId: item.stateId,
      cardId: item.cardId,
      deckId: item.deckId,
      rating,
      reviewedAt: now.getTime(),
      durationMs,
      mode,
      wasNew: before?.state === 0,
      correct,
    }
    await db.reviews.add(review)

    // Nochmal-Karten kommen in derselben Sitzung wieder dran
    let queue = s.queue
    let requeuedKey: string | undefined
    const relearnSoon = mode === 'srs' && after && new Date(after.due).getTime() - now.getTime() < 20 * 60_000
    const repeatFree = mode === 'free' && rating === 1
    if (relearnSoon || repeatFree) {
      requeuedKey = `${item.stateId}#r${now.getTime()}`
      const insertAt = Math.min(queue.length, s.position + 4)
      queue = [...queue.slice(0, insertAt), { ...item, key: requeuedKey }, ...queue.slice(insertAt)]
    }

    const position = s.position + 1
    useSession.setState({
      queue,
      position,
      results: [...s.results, { key: item.key, stateId: item.stateId, cardId: item.cardId, rating, correct, durationMs }],
      undo: [...s.undo, { item, before: mode === 'srs' ? before : undefined, reviewId: review.id, requeuedKey }],
      shownAt: Date.now(),
      finished: position >= queue.length,
    })
  } finally {
    useSession.setState({ busy: false })
  }
}

/** Nimmt die letzte Bewertung zurück. */
export async function undoLast() {
  const s = useSession.getState()
  const last = s.undo.at(-1)
  if (!last || s.busy) return
  useSession.setState({ busy: true })
  try {
    if (last.before) await db.cardStates.put(last.before)
    await db.reviews.delete(last.reviewId)
    const queue = last.requeuedKey ? s.queue.filter((q) => q.key !== last.requeuedKey) : s.queue
    useSession.setState({
      queue,
      position: Math.max(0, s.position - 1),
      results: s.results.slice(0, -1),
      undo: s.undo.slice(0, -1),
      shownAt: Date.now(),
      finished: false,
    })
  } finally {
    useSession.setState({ busy: false })
  }
}

/** Überspringt die aktuelle Karte (z. B. nach dem Aussetzen). */
export function skipCurrent() {
  const s = useSession.getState()
  const queue = s.queue.filter((_, i) => i !== s.position)
  useSession.setState({ queue, shownAt: Date.now(), finished: s.position >= queue.length })
}

/** Beendet die Sitzung vorzeitig (z. B. wenn die Prüfungszeit abläuft). */
export function finishSession() {
  useSession.setState({ finished: true })
}

export function resetSession() {
  useSession.setState(INITIAL)
}

/**
 * Schnellstart für einen Bereich: fällige Karten lernen – oder, wenn nichts fällig ist,
 * 20 Karten frei üben. Gibt `false` zurück, wenn es gar keine Karten gibt.
 */
export async function quickStudy(scope: StudyConfig['scope']): Promise<boolean> {
  const base: StudyConfig = { ...DEFAULT_CONFIG, scope }
  if ((await startSession({ ...base, mode: 'srs' })) > 0) return true
  return (await startSession({ ...base, mode: 'free', limit: 20 })) > 0
}
