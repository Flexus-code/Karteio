import type { Card, CardState, Id } from '@/db/types'
import { parseStateId } from '@/features/cards/model'
import type { SessionItem, StudyConfig } from './types'

type CardLite = Pick<Card, 'id' | 'type' | 'flagged' | 'suspended' | 'tags' | 'createdAt' | 'deletedAt'>
type StateLite = Pick<CardState, 'id' | 'cardId' | 'deckId' | 'due' | 'state' | 'lapses' | 'difficulty' | 'trashed'>

const NEW = 0
const LEARNING = 1
const RELEARNING = 3

export interface SelectInput {
  config: StudyConfig
  states: StateLite[]
  cards: Map<Id, CardLite>
  /** Stapel im gewählten Bereich */
  deckIds: Set<Id>
  now?: number
  /** Restliche Tageslimits (nur Spaced Repetition) */
  newLeft?: number
  reviewLeft?: number
  random?: () => number
}

export function shuffle<T>(list: T[], random = Math.random): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function isDifficult(s: Pick<CardState, 'state' | 'lapses' | 'difficulty'>) {
  return s.state !== NEW && (s.lapses >= 2 || s.difficulty >= 7)
}

/** Wählt die Abfragen für eine Lernsitzung aus. */
export function selectItems(input: SelectInput): SessionItem[] {
  const { config, cards, deckIds, now = Date.now(), random = Math.random } = input

  const eligible = input.states.filter((s) => {
    const card = cards.get(s.cardId)
    if (!card || card.deletedAt || card.suspended || s.trashed || !deckIds.has(s.deckId)) return false
    if (config.flaggedOnly && !card.flagged) return false
    if (config.difficultOnly && !isDifficult(s)) return false
    if (config.newOnly && s.state !== NEW) return false
    if (config.tags.length && !config.tags.some((t) => card.tags.includes(t))) return false
    if (config.mode === 'write' && card.type === 'choice') return false
    if (config.mode !== 'srs' && card.type === 'reversible') {
      const rev = parseStateId(s.id).reverse
      if (config.direction === 'front' && rev) return false
      if (config.direction === 'back' && !rev) return false
    }
    return true
  })

  const created = (s: StateLite) => cards.get(s.cardId)?.createdAt ?? 0
  let picked: StateLite[]

  if (config.mode === 'srs') {
    const dueTime = (s: StateLite) => new Date(s.due).getTime()
    const learning = eligible.filter((s) => (s.state === LEARNING || s.state === RELEARNING) && dueTime(s) <= now)
    const reviews = eligible.filter((s) => s.state !== NEW && s.state !== LEARNING && s.state !== RELEARNING && dueTime(s) <= now)
    const fresh = eligible.filter((s) => s.state === NEW)
    learning.sort((a, b) => dueTime(a) - dueTime(b))
    reviews.sort((a, b) => dueTime(a) - dueTime(b))
    fresh.sort((a, b) => created(a) - created(b) || a.id.localeCompare(b.id))
    const reviewPart = reviews.slice(0, Math.max(0, input.reviewLeft ?? Infinity))
    const newPart = fresh.slice(0, Math.max(0, input.newLeft ?? Infinity))
    // Gemischt, damit neue Karten nicht alle am Ende kommen; Lernschritte zuerst
    picked = [...learning, ...interleave(shuffle(reviewPart, random), newPart)]
  } else {
    picked =
      config.order === 'random'
        ? shuffle(eligible, random)
        : [...eligible].sort((a, b) => created(a) - created(b) || a.id.localeCompare(b.id))
  }

  if (config.limit) picked = picked.slice(0, config.limit)

  return picked.map((s, i) => {
    const card = cards.get(s.cardId)!
    const parsed = parseStateId(s.id)
    let reverse = parsed.reverse
    if (config.mode !== 'srs' && (card.type === 'basic' || card.type === 'input')) {
      reverse = config.direction === 'back' || (config.direction === 'both' && random() < 0.5)
    }
    return { key: `${s.id}#${i}`, stateId: s.id, cardId: s.cardId, deckId: s.deckId, reverse, cloze: parsed.cloze }
  })
}

/** Verteilt `b` gleichmäßig zwischen die Elemente von `a` (Reihenfolge innerhalb bleibt erhalten) */
function interleave<T>(a: T[], b: T[]): T[] {
  const total = a.length + b.length
  const result: T[] = []
  let ai = 0
  let bi = 0
  for (let i = 0; i < total; i++) {
    const takeB = bi < b.length && (ai >= a.length || (bi + 1) / (b.length + 1) <= (i + 1) / (total + 1))
    result.push(takeB ? b[bi++]! : a[ai++]!)
  }
  return result
}

/** Antwortoptionen fürs Quiz: richtige Antwort plus bis zu 3 Ablenker aus anderen Karten. */
export function buildQuizOptions(correct: string, pool: string[], random = Math.random, count = 4): string[] {
  const key = (s: string) => s.trim().toLowerCase()
  const seen = new Set([key(correct)])
  const distractors: string[] = []
  for (const candidate of shuffle(pool, random)) {
    const k = key(candidate)
    if (!k || seen.has(k)) continue
    seen.add(k)
    distractors.push(candidate)
    if (distractors.length >= count - 1) break
  }
  return shuffle([correct, ...distractors], random)
}
