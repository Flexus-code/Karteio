import type { Id, StudyMode } from '@/db/types'

export type Scope = { kind: 'all' } | { kind: 'folder'; id: Id } | { kind: 'deck'; id: Id }

export interface StudyConfig {
  mode: StudyMode
  scope: Scope
  flaggedOnly: boolean
  difficultOnly: boolean
  newOnly: boolean
  tags: string[]
  order: 'random' | 'ordered'
  /** Abfragerichtung für Standard- und Eingabekarten bzw. Auswahl der Richtungen bei umkehrbaren Karten */
  direction: 'front' | 'back' | 'both'
  /** Maximale Anzahl Karten (`null` = alle) */
  limit: number | null
  /** Nur Prüfungssimulation */
  examMinutes: number
}

export const DEFAULT_CONFIG: StudyConfig = {
  mode: 'srs',
  scope: { kind: 'all' },
  flaggedOnly: false,
  difficultOnly: false,
  newOnly: false,
  tags: [],
  order: 'random',
  direction: 'front',
  limit: null,
  examMinutes: 30,
}

/** Eine Abfrage in der Sitzung (dieselbe Karte kann mehrfach vorkommen, z. B. nach „Nochmal“) */
export interface SessionItem {
  key: string
  stateId: string
  cardId: Id
  deckId: Id
  reverse: boolean
  cloze: number | null
}

export const MODE_INFO: Record<StudyMode, { label: string; description: string }> = {
  srs: { label: 'Fällige Karten', description: 'Spaced Repetition – Karteio plant deine Wiederholungen' },
  free: { label: 'Freies Lernen', description: 'Alle Karten durchgehen, ohne den Zeitplan zu ändern' },
  write: { label: 'Schreiben', description: 'Antworten eintippen und vergleichen' },
  quiz: { label: 'Quiz', description: 'Multiple Choice aus deinen Karten' },
  exam: { label: 'Prüfung', description: 'Zufällige Fragen, Timer, Note am Ende' },
}
