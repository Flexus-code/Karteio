import type { Card } from '@/db/types'
import { emptyDraft, type CardDraft } from '@/features/cards/model'
import { docToText, textToDoc } from '@/features/cards/richtext'
import { looksLikeHeader, toCsv } from './csv'

/** Karten als CSV-Zeilen (Vorderseite; Rückseite; Schlagwörter) */
export function cardsToCsv(cards: Card[]): string {
  const rows = cards.map((c) => [
    docToText(c.front),
    c.type === 'choice'
      ? (c.choices ?? [])
          .filter((x) => x.correct)
          .map((x) => x.text)
          .join(', ')
      : docToText(c.back),
    c.tags.join(' '),
  ])
  return toCsv([['Vorderseite', 'Rückseite', 'Schlagwörter'], ...rows])
}

/** CSV-/Textzeilen in Karten-Entwürfe umwandeln. Leere Zeilen und Kopfzeilen werden übersprungen. */
export function rowsToDrafts(rows: string[][], extraTags: string[] = []): CardDraft[] {
  const body = looksLikeHeader(rows[0]) ? rows.slice(1) : rows
  return body
    .filter((r) => (r[0] ?? '').trim())
    .map((r) => {
      const front = r[0]!.trim()
      const back = (r[1] ?? '').trim()
      const tags = [...new Set([...(r[2] ?? '').split(/[\s,]+/).map((t) => t.replace(/^#/, '')).filter(Boolean), ...extraTags])]
      // Lückentext-Syntax erkennen
      const isCloze = /\{\{c\d+::/.test(front)
      return {
        ...emptyDraft(isCloze ? 'cloze' : 'basic', tags),
        front: textToDoc(front),
        back: textToDoc(back),
      }
    })
    .filter((d) => d.type === 'cloze' || docToText(d.back).trim())
}
