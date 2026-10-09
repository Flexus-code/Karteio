import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

export function dayKey(ts: number | Date) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Aufeinanderfolgende Lerntage bis heute (oder bis gestern, falls heute noch nicht gelernt wurde). */
export function computeStreak(days: Set<string>, today = new Date()): number {
  const d = new Date(today)
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export interface TodayStats {
  reviews: number
  minutes: number
  streak: number
  learnedToday: boolean
}

export function useTodayStats(): TodayStats | undefined {
  return useLiveQuery(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const yearAgo = start.getTime() - 400 * 86_400_000
    const recent = await db.reviews.where('reviewedAt').aboveOrEqual(yearAgo).toArray()
    const today = recent.filter((r) => r.reviewedAt >= start.getTime())
    const days = new Set(recent.map((r) => dayKey(r.reviewedAt)))
    return {
      reviews: today.length,
      minutes: Math.round(today.reduce((sum, r) => sum + r.durationMs, 0) / 60_000),
      streak: computeStreak(days),
      learnedToday: today.length > 0,
    }
  })
}
