import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useSession } from '../session'

/** Aktuelle Abfrage samt Karte und Lernstand (live – Änderungen im Editor werden übernommen). */
export function useCurrent() {
  const item = useSession((s) => s.queue[s.position])
  const card = useLiveQuery(() => (item ? db.cards.get(item.cardId) : undefined), [item?.cardId])
  const state = useLiveQuery(() => (item ? db.cardStates.get(item.stateId) : undefined), [item?.stateId, item?.key])
  return { item, card: card && item && card.id === item.cardId ? card : undefined, state }
}
