import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { Library } from './tree'

/** Live-Sicht auf alle Ordner, Stapel und Lernstände. `undefined` während des ersten Ladens. */
export function useLibrary(): Library | undefined {
  return useLiveQuery(async () => {
    const [folders, decks, states] = await Promise.all([
      db.folders.toArray(),
      db.decks.toArray(),
      db.cardStates.where('trashed').equals(0).toArray(),
    ])
    return new Library(folders, decks, states)
  })
}
