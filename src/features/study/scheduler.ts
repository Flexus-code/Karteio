import { fsrs, generatorParameters, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import type { Rating } from '@/db/types'

export function createScheduler(retention: number) {
  return fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true }))
}

export type Scheduler = ReturnType<typeof createScheduler>

export function nextState<T extends FsrsCard>(scheduler: Scheduler, state: T, rating: Rating, now = new Date()): T {
  const { card } = scheduler.next(state, now, rating as Grade)
  return { ...state, ...card }
}

/** Voraussichtliche Intervalle je Bewertung, z. B. { 1: '1 Min.', 3: '3 Tage' } */
export function previewIntervals(scheduler: Scheduler, state: FsrsCard, now = new Date()): Record<Rating, string> {
  const preview = scheduler.repeat(state, now)
  const result = {} as Record<Rating, string>
  for (const r of [1, 2, 3, 4] as Rating[]) {
    const item = preview[r as Grade]
    result[r] = formatInterval(new Date(item.card.due).getTime() - now.getTime())
  }
  return result
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min} Min.`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} Std.`
  const d = Math.round(h / 24)
  if (d < 31) return d === 1 ? '1 Tag' : `${d} Tage`
  const mo = Math.round(d / 30)
  if (mo < 12) return mo === 1 ? '1 Monat' : `${mo} Monate`
  const y = Math.round((d / 365) * 10) / 10
  return `${y.toLocaleString('de-DE')} J.`
}
