import confetti from 'canvas-confetti'
import { useEffect } from 'react'
import { toast } from '@/store/toast'
import { achievements, bestStreak, dailyStats, levelFor, levelTitle, statusBreakdown, xpFor } from './compute'
import { useStatsData } from './useStatsData'
import { computeStreak } from './useToday'

const KEY = 'karteio-progress'

interface Seen {
  achievements: string[]
  level: number
}

function readSeen(): Seen | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Seen) : null
  } catch {
    return null
  }
}

function celebrate() {
  void confetti({ particleCount: 90, spread: 70, origin: { y: 0.25 }, disableForReducedMotion: true, colors: ['#16a34a', '#0f766e', '#f59e0b', '#e11d48', '#2563eb'] })
}

/** Meldet neu freigeschaltete Erfolge und Level-Aufstiege (unsichtbare Komponente). */
export function AchievementWatcher() {
  const data = useStatsData()

  useEffect(() => {
    if (!data) return
    const days = new Set(dailyStats(data.reviews).keys())
    const status = statusBreakdown(data.states)
    const list = achievements({
      reviews: data.reviews,
      cardCount: data.cardCount,
      mastered: status.mastered,
      streak: computeStreak(days),
      best: bestStreak(days),
      exams: data.exams,
    })
    const unlocked = list.filter((a) => a.unlocked)
    const level = levelFor(xpFor(data.reviews)).level
    const seen = readSeen()

    // Beim allerersten Mal nur merken, nicht feiern
    if (seen) {
      const fresh = unlocked.filter((a) => !seen.achievements.includes(a.id))
      if (fresh.length > 0) {
        const a = fresh[0]!
        toast(`${a.icon} Erfolg freigeschaltet: ${a.title}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`, { tone: 'success', durationMs: 4000 })
        celebrate()
      } else if (level > seen.level) {
        toast(`⭐ Level ${level} erreicht: ${levelTitle(level)}!`, { tone: 'success', durationMs: 4000 })
        celebrate()
      }
    }
    localStorage.setItem(KEY, JSON.stringify({ achievements: unlocked.map((a) => a.id), level } satisfies Seen))
  }, [data])

  return null
}
