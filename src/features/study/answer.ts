import type { Card } from '@/db/types'
import { findClozes, stripCloze } from '@/features/cards/cloze'
import { docToText } from '@/features/cards/richtext'

export interface Variant {
  reverse: boolean
  cloze: number | null
}

/** Die erwartete Antwort als Text (für Schreibmodus, Eingabe-Karten und Quiz). */
export function expectedAnswer(card: Pick<Card, 'type' | 'front' | 'back' | 'choices'>, v: Variant): string {
  switch (card.type) {
    case 'cloze': {
      const text = docToText(card.front)
      const matches = findClozes(text).filter((c) => v.cloze === null || c.index === v.cloze)
      return matches.map((m) => m.answer).join(', ')
    }
    case 'choice':
      return (card.choices ?? [])
        .filter((c) => c.correct)
        .map((c) => c.text)
        .join(', ')
    case 'reversible':
      return docToText(v.reverse ? card.front : card.back)
    default:
      return v.reverse ? stripCloze(docToText(card.front)) : docToText(card.back)
  }
}

/** Vereinheitlicht Text für den Vergleich: Groß-/Kleinschreibung, Leerzeichen, Satzzeichen am Rand. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:!?"'„“()-]+|[\s.,;:!?"'„“()-]+$/g, '')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]!
}

export type CheckResult = 'correct' | 'close' | 'wrong'

/**
 * Vergleicht die Eingabe mit der Lösung. Mit Toleranz zählen kleine Tippfehler
 * (etwa 1 Fehler pro 6 Zeichen) als „fast richtig“, was als richtig gewertet wird.
 */
export function checkAnswer(input: string, expected: string, tolerant = true): CheckResult {
  const a = normalize(input)
  const b = normalize(expected)
  if (!a) return 'wrong'
  if (a === b) return 'correct'
  // Mehrere erlaubte Lösungen, z. B. „TCP, UDP“ oder „TCP / UDP“ in beliebiger Reihenfolge
  const parts = (s: string) => s.split(/\s*[,;/]\s*|\s+(?:und|oder)\s+/).filter(Boolean).sort()
  if (parts(a).join('|') === parts(b).join('|')) return 'correct'
  if (!tolerant) return 'wrong'
  const allowed = Math.max(1, Math.floor(b.length / 6))
  return levenshtein(a, b) <= allowed ? 'close' : 'wrong'
}

export interface DiffPart {
  text: string
  kind: 'same' | 'missing' | 'extra'
}

/** Zeichenweiser Vergleich (LCS) für die farbige Hervorhebung von Abweichungen. */
export function diffChars(input: string, expected: string): DiffPart[] {
  const a = input
  const b = expected
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] = al[i] === bl[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const parts: DiffPart[] = []
  const push = (text: string, kind: DiffPart['kind']) => {
    const last = parts.at(-1)
    if (last?.kind === kind) last.text += text
    else parts.push({ text, kind })
  }
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (al[i] === bl[j]) {
      push(b[j]!, 'same')
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push(a[i]!, 'extra')
      i++
    } else {
      push(b[j]!, 'missing')
      j++
    }
  }
  if (i < a.length) push(a.slice(i), 'extra')
  if (j < b.length) push(b.slice(j), 'missing')
  return parts
}

/** IHK-Notenschlüssel (Punkte in %) */
export function ihkGrade(percent: number): { grade: number; label: string } {
  if (percent >= 92) return { grade: 1, label: 'sehr gut' }
  if (percent >= 81) return { grade: 2, label: 'gut' }
  if (percent >= 67) return { grade: 3, label: 'befriedigend' }
  if (percent >= 50) return { grade: 4, label: 'ausreichend' }
  if (percent >= 30) return { grade: 5, label: 'mangelhaft' }
  return { grade: 6, label: 'ungenügend' }
}
