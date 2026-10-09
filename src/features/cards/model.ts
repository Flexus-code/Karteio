import type { Card, CardType, Choice, RichText } from '@/db/types'
import { newId } from '@/lib/id'
import { clozeNumbers } from './cloze'
import { docToText, EMPTY_DOC, isDocEmpty } from './richtext'

/** Bearbeitbarer Inhalt einer Karte (ohne Verwaltungsfelder) */
export interface CardDraft {
  type: CardType
  front: RichText
  back: RichText
  choices: Choice[]
  hint: string
  notes: string
  tags: string[]
}

export const CARD_TYPES: { type: CardType; label: string; short: string; description: string }[] = [
  { type: 'basic', label: 'Standard', short: 'Standard', description: 'Frage vorne, Antwort hinten' },
  { type: 'reversible', label: 'Umkehrbar', short: 'Umkehrbar', description: 'Wird in beide Richtungen abgefragt' },
  { type: 'cloze', label: 'Lückentext', short: 'Lücke', description: 'Begriffe im Text werden ausgeblendet' },
  { type: 'choice', label: 'Multiple Choice', short: 'Auswahl', description: 'Richtige Antworten auswählen' },
  { type: 'input', label: 'Eingabe', short: 'Eingabe', description: 'Antwort wird eingetippt' },
]

export function cardTypeLabel(type: CardType) {
  return CARD_TYPES.find((t) => t.type === type)?.label ?? type
}

export function newChoice(text = '', correct = false): Choice {
  return { id: newId(), text, correct }
}

export function emptyDraft(type: CardType = 'basic', tags: string[] = []): CardDraft {
  return {
    type,
    front: EMPTY_DOC,
    back: EMPTY_DOC,
    choices: [newChoice('', true), newChoice(), newChoice()],
    hint: '',
    notes: '',
    tags,
  }
}

export function draftFromCard(card: Card): CardDraft {
  return {
    type: card.type,
    front: card.front,
    back: card.back,
    choices: card.choices?.length ? card.choices : emptyDraft().choices,
    hint: card.hint ?? '',
    notes: card.notes ?? '',
    tags: card.tags,
  }
}

/** Prüft, ob die Karte gespeichert werden kann. Gibt eine verständliche Meldung zurück oder `null`. */
export function validateDraft(d: CardDraft): string | null {
  if (isDocEmpty(d.front)) return d.type === 'cloze' ? 'Der Lückentext ist leer.' : 'Die Vorderseite ist leer.'
  switch (d.type) {
    case 'basic':
    case 'reversible':
      return isDocEmpty(d.back) ? 'Die Rückseite ist leer.' : null
    case 'input':
      return docToText(d.back).trim() ? null : 'Gib die richtige Antwort auf der Rückseite ein.'
    case 'cloze':
      return clozeNumbers(docToText(d.front)).length ? null : 'Markiere mindestens ein Wort als Lücke.'
    case 'choice': {
      const filled = d.choices.filter((c) => c.text.trim())
      if (filled.length < 2) return 'Lege mindestens zwei Antwortmöglichkeiten an.'
      if (!filled.some((c) => c.correct)) return 'Markiere mindestens eine Antwort als richtig.'
      return null
    }
  }
}

/** Entfernt leere Antwortmöglichkeiten vor dem Speichern */
export function normalizeDraft(d: CardDraft): CardDraft {
  return {
    ...d,
    choices: d.type === 'choice' ? d.choices.filter((c) => c.text.trim()).map((c) => ({ ...c, text: c.text.trim() })) : [],
    hint: d.hint.trim(),
    notes: d.notes.trim(),
    tags: [...new Set(d.tags.map((t) => t.trim()).filter(Boolean))],
  }
}

/**
 * Welche Lernstände (Abfragerichtungen) gehören zu einer Karte?
 * Umkehrbar → 2, Lückentext → eine pro Lückennummer, sonst 1.
 */
export function stateIdsFor(card: Pick<Card, 'id' | 'type' | 'front'>): string[] {
  switch (card.type) {
    case 'reversible':
      return [card.id, `${card.id}:rev`]
    case 'cloze': {
      const nums = clozeNumbers(docToText(card.front))
      return nums.length ? nums.map((n) => `${card.id}:c${n}`) : [card.id]
    }
    default:
      return [card.id]
  }
}

/** Zerlegt eine Lernstand-ID wieder in Karte und Variante */
export function parseStateId(id: string): { cardId: string; reverse: boolean; cloze: number | null } {
  const [cardId = id, variant] = id.split(':')
  return {
    cardId,
    reverse: variant === 'rev',
    cloze: variant?.startsWith('c') ? Number(variant.slice(1)) : null,
  }
}
