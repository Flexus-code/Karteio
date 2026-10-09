import { describe, expect, it } from 'vitest'
import type { Card, CardState } from '@/db/types'
import { textToDoc } from '@/features/cards/richtext'
import { checkAnswer, diffChars, expectedAnswer, ihkGrade } from './answer'
import { createScheduler, formatInterval, nextState, previewIntervals } from './scheduler'
import { buildQuizOptions, selectItems, shuffle } from './select'
import { DEFAULT_CONFIG, type StudyConfig } from './types'
import { createEmptyCard } from 'ts-fsrs'

const NOW = new Date('2026-10-09T12:00:00Z').getTime()
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

type CardLite = Pick<Card, 'id' | 'type' | 'flagged' | 'suspended' | 'tags' | 'createdAt' | 'deletedAt'>
const card = (id: string, extra: Partial<CardLite> = {}): CardLite => ({ id, type: 'basic', flagged: false, suspended: false, tags: [], createdAt: 0, ...extra })
const state = (id: string, extra: Partial<CardState> = {}): CardState => ({
  ...createEmptyCard(new Date(NOW)),
  id,
  cardId: id.split(':')[0]!,
  deckId: 'd',
  trashed: 0,
  ...extra,
})

describe('Kartenauswahl', () => {
  const cards = new Map([
    ['a', card('a', { createdAt: 1 })],
    ['b', card('b', { createdAt: 2, flagged: true })],
    ['c', card('c', { createdAt: 3, suspended: true })],
    ['r', card('r', { createdAt: 4, type: 'reversible' })],
  ])
  const past = new Date(NOW - 1000)
  const future = new Date(NOW + 86_400_000)
  const states = [
    state('a'), // neu
    state('b', { state: 2, due: past }), // fällige Wiederholung
    state('c', { state: 2, due: past }), // ausgesetzt
    state('r', { state: 2, due: future }),
    state('r:rev', { state: 1, due: past, lapses: 3 }), // Lernschritt, schwierig
  ]
  const base = { states, cards, deckIds: new Set(['d']), now: NOW, random: seeded() }
  const cfg = (p: Partial<StudyConfig>): StudyConfig => ({ ...DEFAULT_CONFIG, ...p })

  it('Spaced Repetition: Lernschritte, fällige und neue Karten – ohne ausgesetzte', () => {
    const ids = selectItems({ ...base, config: cfg({ mode: 'srs' }) }).map((i) => i.stateId)
    expect(ids[0]).toBe('r:rev')
    expect(ids.sort()).toEqual(['a', 'b', 'r:rev'])
  })

  it('respektiert Tageslimits', () => {
    const ids = selectItems({ ...base, config: cfg({ mode: 'srs' }), newLeft: 0 }).map((i) => i.stateId)
    expect(ids).not.toContain('a')
  })

  it('filtert nach markiert / schwierig / neu', () => {
    expect(selectItems({ ...base, config: cfg({ mode: 'free', flaggedOnly: true }) }).map((i) => i.stateId)).toEqual(['b'])
    expect(selectItems({ ...base, config: cfg({ mode: 'free', difficultOnly: true, direction: 'both' }) }).map((i) => i.stateId)).toEqual(['r:rev'])
    expect(selectItems({ ...base, config: cfg({ mode: 'free', newOnly: true }) }).map((i) => i.stateId)).toEqual(['a'])
  })

  it('Richtung bei umkehrbaren Karten', () => {
    const front = selectItems({ ...base, config: cfg({ mode: 'free', order: 'ordered', direction: 'front' }) }).map((i) => i.stateId)
    expect(front).toEqual(['a', 'b', 'r'])
    const back = selectItems({ ...base, config: cfg({ mode: 'free', order: 'ordered', direction: 'back' }) })
    expect(back.map((i) => i.stateId)).toEqual(['a', 'b', 'r:rev'])
    expect(back.every((i) => i.reverse)).toBe(true)
  })

  it('begrenzt die Anzahl', () => {
    expect(selectItems({ ...base, config: cfg({ mode: 'free', limit: 2 }) })).toHaveLength(2)
  })

  it('mischt deterministisch mit Seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)))
  })
})

describe('Quiz-Optionen', () => {
  it('enthält die richtige Antwort und keine Duplikate', () => {
    const opts = buildQuizOptions('TCP', ['UDP', 'tcp', 'IP', 'ICMP', 'UDP', 'ARP'], seeded())
    expect(opts).toHaveLength(4)
    expect(opts).toContain('TCP')
    expect(new Set(opts.map((o) => o.toLowerCase())).size).toBe(4)
  })
  it('kommt mit wenigen Karten aus', () => {
    expect(buildQuizOptions('A', ['B'], seeded())).toHaveLength(2)
  })
})

describe('Antwortprüfung', () => {
  it('ignoriert Groß-/Kleinschreibung und Satzzeichen', () => {
    expect(checkAnswer('  routing. ', 'Routing')).toBe('correct')
  })
  it('akzeptiert Aufzählungen in anderer Reihenfolge', () => {
    expect(checkAnswer('UDP und TCP', 'TCP, UDP')).toBe('correct')
  })
  it('erkennt Tippfehler', () => {
    expect(checkAnswer('Vermitlungsschicht', 'Vermittlungsschicht')).toBe('close')
    expect(checkAnswer('Vermitlungsschicht', 'Vermittlungsschicht', false)).toBe('wrong')
    expect(checkAnswer('Transportschicht', 'Vermittlungsschicht')).toBe('wrong')
    expect(checkAnswer('', 'x')).toBe('wrong')
  })
  it('markiert Abweichungen', () => {
    const d = diffChars('Rautr', 'Router')
    expect(d.map((p) => p.text).join('')).toContain('R')
    expect(d.some((p) => p.kind === 'missing')).toBe(true)
    expect(d.some((p) => p.kind === 'extra')).toBe(true)
  })
  it('liefert die erwartete Antwort je Kartentyp', () => {
    const base = { front: textToDoc('Frage'), back: textToDoc('Antwort'), choices: [] }
    expect(expectedAnswer({ ...base, type: 'basic' }, { reverse: false, cloze: null })).toBe('Antwort')
    expect(expectedAnswer({ ...base, type: 'reversible' }, { reverse: true, cloze: null })).toBe('Frage')
    const cloze = { ...base, type: 'cloze' as const, front: textToDoc('{{c1::TCP}} und {{c2::UDP}}') }
    expect(expectedAnswer(cloze, { reverse: false, cloze: 2 })).toBe('UDP')
  })
})

describe('Planung & Note', () => {
  it('verlängert Intervalle bei „Gut“ und zeigt eine Vorschau', () => {
    const s = createScheduler(0.9)
    const now = new Date(NOW)
    const st = state('x')
    const preview = previewIntervals(s, st, now)
    expect(Object.keys(preview)).toHaveLength(4)
    const after = nextState(s, st, 3, now)
    expect(after.reps).toBe(1)
    expect(new Date(after.due).getTime()).toBeGreaterThan(NOW)
  })
  it('formatiert Intervalle', () => {
    expect(formatInterval(5 * 60_000)).toBe('5 Min.')
    expect(formatInterval(3 * 86_400_000)).toBe('3 Tage')
    expect(formatInterval(86_400_000)).toBe('1 Tag')
  })
  it('IHK-Notenschlüssel', () => {
    expect(ihkGrade(95).grade).toBe(1)
    expect(ihkGrade(81).grade).toBe(2)
    expect(ihkGrade(50).label).toBe('ausreichend')
    expect(ihkGrade(10).grade).toBe(6)
  })
})
