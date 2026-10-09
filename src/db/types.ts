import type { Card as FsrsCard } from 'ts-fsrs'

export type Id = string

/** Farbschlüssel aus `ITEM_COLORS` */
export type ItemColor = 'indigo' | 'violet' | 'blue' | 'cyan' | 'teal' | 'green' | 'amber' | 'orange' | 'rose' | 'slate'

interface Timestamps {
  createdAt: number
  updatedAt: number
  /** Gesetzt, wenn das Element im Papierkorb liegt */
  deletedAt?: number
}

export interface Folder extends Timestamps {
  id: Id
  /** `null` = oberste Ebene */
  parentId: Id | null
  name: string
  color: ItemColor
  icon: string
  order: number
}

export interface Deck extends Timestamps {
  id: Id
  /** `null` = oberste Ebene */
  folderId: Id | null
  name: string
  description: string
  color: ItemColor
  icon: string
  order: number
}

export type CardType = 'basic' | 'reversible' | 'cloze' | 'choice' | 'input'

/** Knoten eines TipTap-Dokuments */
export interface RichTextNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: RichTextNode[]
}

/** TipTap-Dokument (JSON) */
export type RichText = { type: 'doc'; content?: RichTextNode[] }

export interface Choice {
  id: Id
  text: string
  correct: boolean
}

export interface Card extends Timestamps {
  id: Id
  deckId: Id
  type: CardType
  front: RichText
  back: RichText
  hint?: string
  notes?: string
  choices?: Choice[]
  tags: string[]
  /** Verweise auf Einträge in `media` */
  mediaIds: Id[]
  flagged: boolean
  suspended: boolean
}

export type CardStateState = FsrsCard['state']

/**
 * Lernstand einer Karte (bzw. einer Kartenrichtung).
 * `deckId` und `trashed` sind dupliziert, damit Statistiken ohne Laden der Karteninhalte möglich sind.
 */
export interface CardState extends FsrsCard {
  /** `${cardId}` oder `${cardId}:rev` bzw. `${cardId}:c2` für Varianten */
  id: string
  cardId: Id
  deckId: Id
  trashed: 0 | 1
}

export type Rating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy
export type StudyMode = 'srs' | 'free' | 'write' | 'quiz' | 'exam'

export interface Review {
  id: Id
  cardStateId: string
  cardId: Id
  deckId: Id
  rating: Rating
  reviewedAt: number
  durationMs: number
  mode: StudyMode
  /** War die Karte vor dieser Bewertung neu? (für das Tageslimit neuer Karten) */
  wasNew?: boolean
  /** Antwort richtig? (Quiz, Schreiben, Prüfung) */
  correct?: boolean
}

export interface Media {
  id: Id
  blob: Blob
  mimeType: string
  createdAt: number
}

export interface KeyValue {
  key: string
  value: unknown
}
