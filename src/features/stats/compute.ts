import type { CardState, Review } from '@/db/types'
import { MASTERED_DAYS } from '@/features/library/tree'
import { dayKey } from './useToday'

const DAY = 86_400_000

export interface DayStat {
  count: number
  ms: number
  correct: number
}

type ReviewLite = Pick<Review, 'reviewedAt' | 'durationMs' | 'rating' | 'correct' | 'mode'>
type StateLite = Pick<CardState, 'due' | 'state' | 'scheduled_days'>

export function startOfDay(ts: number | Date) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d
}

const isCorrect = (r: ReviewLite) => r.correct ?? r.rating >= 3

export function dailyStats(reviews: ReviewLite[]): Map<string, DayStat> {
  const map = new Map<string, DayStat>()
  for (const r of reviews) {
    const k = dayKey(r.reviewedAt)
    const s = map.get(k) ?? { count: 0, ms: 0, correct: 0 }
    s.count++
    s.ms += r.durationMs
    if (isCorrect(r)) s.correct++
    map.set(k, s)
  }
  return map
}

/** Werte der letzten `days` Tage (ältester zuerst, heute zuletzt) */
export function lastDays(map: Map<string, DayStat>, days: number, today = new Date()): { date: Date; stat: DayStat }[] {
  const result = []
  const start = startOfDay(today)
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(start)
    date.setDate(start.getDate() - i)
    result.push({ date, stat: map.get(dayKey(date)) ?? { count: 0, ms: 0, correct: 0 } })
  }
  return result
}

/** Kalender-Raster für die Heatmap: Spalten = Wochen (Mo–So), letzte Spalte = aktuelle Woche */
export function heatmapWeeks(map: Map<string, DayStat>, weeks: number, today = new Date()) {
  const end = startOfDay(today)
  const mondayOffset = (end.getDay() + 6) % 7
  const firstMonday = new Date(end)
  firstMonday.setDate(end.getDate() - mondayOffset - (weeks - 1) * 7)
  const columns: { date: Date; count: number; future: boolean }[][] = []
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(firstMonday)
      date.setDate(firstMonday.getDate() + w * 7 + d)
      col.push({ date, count: map.get(dayKey(date))?.count ?? 0, future: date > end })
    }
    columns.push(col)
  }
  return columns
}

/** Fällige Wiederholungen der nächsten Tage (Überfälliges zählt zu heute; neue Karten nicht) */
export function forecast(states: StateLite[], days: number, now = Date.now()): number[] {
  const result = new Array<number>(days).fill(0)
  const today = startOfDay(now).getTime()
  for (const s of states) {
    if (s.state === 0) continue
    const idx = Math.max(0, Math.floor((startOfDay(new Date(s.due)).getTime() - today) / DAY))
    if (idx < days) result[idx]!++
  }
  return result
}

export function statusBreakdown(states: StateLite[]) {
  let fresh = 0
  let learning = 0
  let mastered = 0
  for (const s of states) {
    if (s.state === 0) fresh++
    else if (s.state === 2 && s.scheduled_days >= MASTERED_DAYS) mastered++
    else learning++
  }
  return { fresh, learning, mastered, total: states.length }
}

export function bestStreak(days: Set<string>): number {
  const sorted = [...days].sort()
  let best = 0
  let current = 0
  let prev: number | null = null
  for (const k of sorted) {
    const [y, m, d] = k.split('-').map(Number)
    const t = new Date(y!, m! - 1, d!).getTime()
    current = prev !== null && Math.round((t - prev) / DAY) === 1 ? current + 1 : 1
    best = Math.max(best, current)
    prev = t
  }
  return best
}

// ---------- XP & Level ----------

/** 10 XP pro Antwort, +5 für richtige Antworten */
export function xpFor(reviews: ReviewLite[]): number {
  return reviews.reduce((sum, r) => sum + 10 + (isCorrect(r) ? 5 : 0), 0)
}

/** Level n erfordert insgesamt 50·(n−1)² XP */
export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1
  const current = 50 * (level - 1) ** 2
  const next = 50 * level ** 2
  return { level, xp, current, next, progress: (xp - current) / (next - current) }
}

export const LEVEL_TITLES = ['Neuling', 'Lernender', 'Fleißige Biene', 'Wissenssammler', 'Kartenprofi', 'Gedächtniskünstler', 'Prüfungsheld', 'Meister', 'Großmeister', 'Legende']
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)]!

// ---------- Prüfungsplan ----------

export interface ExamPlan {
  daysLeft: number
  /** Neue Karten pro Tag, um alle bis kurz vor der Prüfung einmal gelernt zu haben */
  newPerDay: number
  /** Puffertage vor der Prüfung nur zum Wiederholen */
  bufferDays: number
}

export function examPlan(examDate: string, newCount: number, now = new Date()): ExamPlan | null {
  const [y, m, d] = examDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const exam = new Date(y, m - 1, d)
  const daysLeft = Math.round((exam.getTime() - startOfDay(now).getTime()) / DAY)
  const bufferDays = daysLeft > 14 ? 3 : daysLeft > 5 ? 1 : 0
  const learnDays = Math.max(1, daysLeft - bufferDays)
  return { daysLeft, bufferDays, newPerDay: daysLeft <= 0 ? 0 : Math.ceil(newCount / learnDays) }
}

// ---------- Erfolge ----------

export interface ExamResult {
  date: number
  percent: number
  grade: number
  questions: number
}

export interface AchievementInput {
  reviews: ReviewLite[]
  cardCount: number
  mastered: number
  streak: number
  best: number
  exams: ExamResult[]
}

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  /** 0–1 */
  progress: number
  unlocked: boolean
}

export function achievements(input: AchievementInput): Achievement[] {
  const n = input.reviews.length
  const hours = input.reviews.map((r) => new Date(r.reviewedAt).getHours())
  const items: Omit<Achievement, 'unlocked'>[] = [
    { id: 'first', icon: '🌱', title: 'Erste Schritte', description: 'Die erste Karte gelernt', progress: Math.min(1, n) },
    { id: 'r100', icon: '💪', title: 'Fleißig', description: '100 Karten gelernt', progress: n / 100 },
    { id: 'r1000', icon: '🚀', title: 'Lernmaschine', description: '1.000 Karten gelernt', progress: n / 1000 },
    { id: 's3', icon: '🔥', title: 'Am Ball', description: '3 Tage in Folge gelernt', progress: input.best / 3 },
    { id: 's7', icon: '📅', title: 'Wochenserie', description: '7 Tage in Folge gelernt', progress: input.best / 7 },
    { id: 's30', icon: '🏅', title: 'Unaufhaltsam', description: '30 Tage in Folge gelernt', progress: input.best / 30 },
    { id: 'c50', icon: '🗂️', title: 'Kartensammler', description: '50 Karten erstellt', progress: input.cardCount / 50 },
    { id: 'c200', icon: '📚', title: 'Bibliothekar', description: '200 Karten erstellt', progress: input.cardCount / 200 },
    { id: 'm50', icon: '🧠', title: 'Gedächtnisprofi', description: '50 Karten beherrscht', progress: input.mastered / 50 },
    { id: 'owl', icon: '🦉', title: 'Nachteule', description: 'Nach 22 Uhr gelernt', progress: hours.some((h) => h >= 22) ? 1 : 0 },
    { id: 'early', icon: '🐦', title: 'Frühaufsteher', description: 'Vor 7 Uhr gelernt', progress: hours.some((h) => h < 7) ? 1 : 0 },
    { id: 'exam', icon: '🎓', title: 'Prüfungsreif', description: 'Prüfungssimulation mit Note 2 oder besser', progress: input.exams.some((e) => e.grade <= 2 && e.questions >= 10) ? 1 : 0 },
  ]
  return items.map((a) => ({ ...a, progress: Math.min(1, Math.max(0, a.progress)), unlocked: a.progress >= 1 }))
}
