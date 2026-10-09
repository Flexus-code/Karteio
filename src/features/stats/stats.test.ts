import { describe, expect, it } from 'vitest'
import type { Review } from '@/db/types'
import { achievements, bestStreak, dailyStats, examPlan, forecast, heatmapWeeks, lastDays, levelFor, statusBreakdown, xpFor } from './compute'
import { computeStreak, dayKey } from './useToday'

const today = new Date(2026, 9, 9, 12) // Fr, 9. Okt. 2026
const at = (daysAgo: number, hour = 12) => new Date(2026, 9, 9 - daysAgo, hour).getTime()
const review = (daysAgo: number, extra: Partial<Review> = {}) => ({ reviewedAt: at(daysAgo), durationMs: 6000, rating: 3 as const, mode: 'srs' as const, ...extra })

describe('Tagesstatistik', () => {
  const reviews = [review(0), review(0, { rating: 1 }), review(2)]
  const map = dailyStats(reviews)

  it('zählt pro Tag', () => {
    expect(map.get(dayKey(today))).toEqual({ count: 2, ms: 12000, correct: 1 })
  })

  it('liefert die letzten Tage, heute zuletzt', () => {
    const days = lastDays(map, 3, today)
    expect(days.map((d) => d.stat.count)).toEqual([1, 0, 2])
  })

  it('baut Wochenspalten von Montag bis Sonntag', () => {
    const cols = heatmapWeeks(map, 2, today)
    expect(cols).toHaveLength(2)
    expect(cols[0]![0]!.date.getDay()).toBe(1) // Montag
    const last = cols[1]!
    expect(last[4]!.count).toBe(2) // Freitag = heute
    expect(last[5]!.future).toBe(true)
  })
})

describe('Streaks', () => {
  const days = new Set([dayKey(at(0)), dayKey(at(1)), dayKey(at(2)), dayKey(at(5)), dayKey(at(6))])
  it('aktuelle Serie', () => {
    expect(computeStreak(days, today)).toBe(3)
    expect(computeStreak(new Set([dayKey(at(1))]), today)).toBe(1) // gestern zählt noch
    expect(computeStreak(new Set([dayKey(at(2))]), today)).toBe(0)
  })
  it('beste Serie', () => {
    expect(bestStreak(days)).toBe(3)
    expect(bestStreak(new Set())).toBe(0)
  })
})

describe('Prognose & Status', () => {
  const now = today.getTime()
  const st = (dueDaysAhead: number, state = 2, scheduled_days = 5) => ({ due: new Date(now + dueDaysAhead * 86_400_000), state: state as 0 | 1 | 2 | 3, scheduled_days })
  it('verteilt fällige Karten auf Tage, Überfälliges auf heute', () => {
    expect(forecast([st(-3), st(0), st(1), st(1), st(10), st(0, 0)], 3, now)).toEqual([2, 2, 0])
  })
  it('unterscheidet neu / lernend / beherrscht', () => {
    expect(statusBreakdown([st(0, 0), st(0, 1), st(0, 2, 30), st(0, 2, 3)])).toEqual({ fresh: 1, learning: 2, mastered: 1, total: 4 })
  })
})

describe('XP, Level & Prüfungsplan', () => {
  it('berechnet XP und Level', () => {
    expect(xpFor([review(0), review(0, { rating: 1 })])).toBe(25)
    expect(levelFor(0)).toMatchObject({ level: 1, next: 50 })
    expect(levelFor(60)).toMatchObject({ level: 2, current: 50, next: 200 })
  })
  it('plant neue Karten bis zur Prüfung mit Puffer', () => {
    expect(examPlan('2026-11-08', 270, today)).toEqual({ daysLeft: 30, bufferDays: 3, newPerDay: 10 })
    expect(examPlan('2026-10-09', 50, today)?.newPerDay).toBe(0)
    expect(examPlan('kaputt', 1, today)).toBeNull()
  })
})

describe('Erfolge', () => {
  it('schaltet Erfolge frei und zeigt Fortschritt', () => {
    const list = achievements({ reviews: [review(0, { reviewedAt: new Date(2026, 9, 9, 23).getTime() })], cardCount: 25, mastered: 0, streak: 1, best: 1, exams: [] })
    const byId = Object.fromEntries(list.map((a) => [a.id, a]))
    expect(byId.first!.unlocked).toBe(true)
    expect(byId.owl!.unlocked).toBe(true)
    expect(byId.c50!.progress).toBe(0.5)
    expect(byId.exam!.unlocked).toBe(false)
  })
})
