import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { ExamResult } from './compute'

const EXAM_KEY = 'examResults'

export async function loadExamResults(): Promise<ExamResult[]> {
  return ((await db.kv.get(EXAM_KEY))?.value as ExamResult[] | undefined) ?? []
}

export async function saveExamResult(result: ExamResult) {
  const list = await loadExamResults()
  await db.kv.put({ key: EXAM_KEY, value: [...list, result].slice(-50) })
}

/** Rohdaten für Statistik und Erfolge (live) */
export function useStatsData() {
  return useLiveQuery(async () => {
    const [reviews, states, cardCount, exams] = await Promise.all([
      db.reviews.toArray(),
      db.cardStates.where('trashed').equals(0).toArray(),
      db.cards.filter((c) => !c.deletedAt).count(),
      loadExamResults(),
    ])
    return { reviews, states, cardCount, exams }
  })
}
