import Dexie, { type EntityTable } from 'dexie'
import type { Card, CardState, Deck, Folder, KeyValue, Media, Review } from './types'

export class KarteioDB extends Dexie {
  folders!: EntityTable<Folder, 'id'>
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Card, 'id'>
  cardStates!: EntityTable<CardState, 'id'>
  reviews!: EntityTable<Review, 'id'>
  media!: EntityTable<Media, 'id'>
  kv!: EntityTable<KeyValue, 'key'>

  constructor() {
    super('karteio')
    // Neue Schema-Versionen immer UNTEN anhängen (mit .upgrade() für Migrationen), nie bestehende ändern.
    this.version(1).stores({
      folders: 'id, parentId, deletedAt',
      decks: 'id, folderId, deletedAt',
      cards: 'id, deckId, *tags, deletedAt, updatedAt',
      cardStates: 'id, cardId, deckId, due, state, trashed',
      reviews: 'id, cardId, deckId, reviewedAt',
      media: 'id',
      kv: 'key',
    })
  }
}

export const db = new KarteioDB()
