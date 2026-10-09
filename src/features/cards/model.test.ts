import { describe, expect, it } from 'vitest'
import { emptyDraft, newChoice, normalizeDraft, parseStateId, stateIdsFor, validateDraft, type CardDraft } from './model'
import { textToDoc } from './richtext'

const draft = (p: Partial<CardDraft>): CardDraft => ({ ...emptyDraft(), ...p })

describe('Karten-Validierung', () => {
  it('verlangt Vorder- und Rückseite', () => {
    expect(validateDraft(draft({}))).toMatch(/Vorderseite/)
    expect(validateDraft(draft({ front: textToDoc('Frage') }))).toMatch(/Rückseite/)
    expect(validateDraft(draft({ front: textToDoc('Frage'), back: textToDoc('Antwort') }))).toBeNull()
  })

  it('verlangt beim Lückentext mindestens eine Lücke', () => {
    expect(validateDraft(draft({ type: 'cloze', front: textToDoc('ohne Lücke') }))).toMatch(/Lücke/)
    expect(validateDraft(draft({ type: 'cloze', front: textToDoc('mit {{c1::Lücke}}') }))).toBeNull()
  })

  it('prüft Multiple-Choice-Antworten', () => {
    const front = textToDoc('Frage?')
    expect(validateDraft(draft({ type: 'choice', front, choices: [newChoice('A', true), newChoice('')] }))).toMatch(/zwei/)
    expect(validateDraft(draft({ type: 'choice', front, choices: [newChoice('A'), newChoice('B')] }))).toMatch(/richtig/)
    expect(validateDraft(draft({ type: 'choice', front, choices: [newChoice('A', true), newChoice('B')] }))).toBeNull()
  })

  it('räumt beim Speichern auf', () => {
    const d = normalizeDraft(draft({ type: 'choice', tags: [' a ', 'a', ''], choices: [newChoice(' X ', true), newChoice('  ')] }))
    expect(d.tags).toEqual(['a'])
    expect(d.choices.map((c) => c.text)).toEqual(['X'])
  })
})

describe('Lernstände pro Karte', () => {
  it('erzeugt je nach Typ passende Abfragen', () => {
    expect(stateIdsFor({ id: 'k', type: 'basic', front: textToDoc('x') })).toEqual(['k'])
    expect(stateIdsFor({ id: 'k', type: 'reversible', front: textToDoc('x') })).toEqual(['k', 'k:rev'])
    expect(stateIdsFor({ id: 'k', type: 'cloze', front: textToDoc('{{c2::a}} {{c1::b}} {{c2::c}}') })).toEqual(['k:c1', 'k:c2'])
  })

  it('zerlegt IDs wieder', () => {
    expect(parseStateId('k:rev')).toEqual({ cardId: 'k', reverse: true, cloze: null })
    expect(parseStateId('k:c3')).toEqual({ cardId: 'k', reverse: false, cloze: 3 })
    expect(parseStateId('k')).toEqual({ cardId: 'k', reverse: false, cloze: null })
  })
})
