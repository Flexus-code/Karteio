import { motion } from 'framer-motion'
import { BarChart3, CheckCircle2, Clock, Flame, Lock, type LucideIcon } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { ItemIcon } from '@/features/library/ItemIcon'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { useLibrary } from '@/features/library/useLibrary'
import { BarChart, Heatmap, StackedBar } from '@/features/stats/charts'
import { achievements, bestStreak, dailyStats, forecast, heatmapWeeks, lastDays, levelFor, levelTitle, statusBreakdown, xpFor } from '@/features/stats/compute'
import { ExamCountdown } from '@/features/stats/ExamCountdown'
import { useStatsData } from '@/features/stats/useStatsData'
import { computeStreak, dayKey } from '@/features/stats/useToday'
import { useSettings } from '@/store/settings'

const fmtHours = (ms: number) => {
  const min = Math.round(ms / 60_000)
  return min < 60 ? `${min} Min.` : `${(min / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.`
}

export function StatsPage() {
  const navigate = useNavigate()
  const data = useStatsData()
  const library = useLibrary()
  const goal = useSettings((s) => s.dailyGoal)

  const s = useMemo(() => {
    if (!data) return null
    const map = dailyStats(data.reviews)
    const days = new Set(map.keys())
    const last30 = lastDays(map, 30)
    const recent = last30.reduce((acc, d) => ({ count: acc.count + d.stat.count, correct: acc.correct + d.stat.correct }), { count: 0, correct: 0 })
    const status = statusBreakdown(data.states)
    const streak = computeStreak(days)
    const best = bestStreak(days)
    const xp = xpFor(data.reviews)
    return {
      weeks: heatmapWeeks(map, 18),
      last30,
      forecast: forecast(data.states, 30),
      status,
      streak,
      best,
      level: levelFor(xp),
      totalMs: data.reviews.reduce((sum, r) => sum + r.durationMs, 0),
      accuracy: recent.count ? Math.round((recent.correct / recent.count) * 100) : null,
      achievements: achievements({ reviews: data.reviews, cardCount: data.cardCount, mastered: status.mastered, streak, best, exams: data.exams }),
      learnedToday: days.has(dayKey(new Date())),
    }
  }, [data])

  if (!data || !library || !s) return <LibrarySkeleton />

  if (data.cardCount === 0) {
    return (
      <>
        <PageHeader title="Statistik" />
        <EmptyState
          icon={BarChart3}
          title="Noch keine Daten"
          text="Lege Karten an und lerne ein paar davon – dann siehst du hier Fortschritt, Streak und deinen Lernkalender."
          action={<Button onClick={() => navigate('/ordner')}>Zu den Ordnern</Button>}
        />
      </>
    )
  }

  const unlocked = s.achievements.filter((a) => a.unlocked).length
  const topItems = [
    ...library.foldersIn(null).map((f) => ({ id: f.id, kind: 'folder' as const, name: f.name, icon: f.icon, color: f.color, stats: library.statsForFolder(f.id) })),
    ...library.decksIn(null).map((d) => ({ id: d.id, kind: 'deck' as const, name: d.name, icon: d.icon, color: d.color, stats: library.statsForDeck(d.id) })),
  ].filter((i) => i.stats.total > 0)

  return (
    <>
      <PageHeader title="Statistik" />
      <div className="space-y-5 px-5 pb-4">
        {/* Level */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] accent-gradient p-5 text-white shadow-lift">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <motion.div
              initial={{ rotate: -20, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Level</span>
              <span className="text-[26px] font-extrabold leading-none">{s.level.level}</span>
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-[19px] font-bold tracking-tight">{levelTitle(s.level.level)}</p>
              <p className="mb-2 text-[13px] opacity-85">
                {s.level.xp.toLocaleString('de-DE')} XP · noch {(s.level.next - s.level.xp).toLocaleString('de-DE')} bis Level {s.level.level + 1}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${s.level.progress * 100}%` }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-2 gap-3">
          <Tile icon={Flame} tint="text-warning" value={`${s.streak}`} unit={s.streak === 1 ? 'Tag' : 'Tage'} label={`Streak · Rekord ${s.best}`} />
          <Tile icon={CheckCircle2} tint="text-success" value={s.accuracy === null ? '–' : `${s.accuracy} %`} label="Richtig (30 Tage)" />
          <Tile icon={BarChart3} tint="text-accent" value={data.reviews.length.toLocaleString('de-DE')} label="Antworten gesamt" />
          <Tile icon={Clock} tint="text-accent" value={fmtHours(s.totalMs)} label="Lernzeit gesamt" />
        </div>

        <ExamCountdown newCount={s.status.fresh} />

        <Section title="Lernkalender" hint={!s.learnedToday ? 'Heute noch nicht gelernt' : undefined}>
          <Card className="p-4">
            <Heatmap weeks={s.weeks} goal={goal} />
          </Card>
        </Section>

        <Section title="Antworten pro Tag">
          <Card className="p-4">
            <BarChart values={s.last30.map((d) => d.stat.count)} labels={['vor 30 Tagen', 'heute']} unit="Antworten" />
          </Card>
        </Section>

        <Section title="Prognose: fällige Wiederholungen">
          <Card className="p-4">
            <BarChart values={s.forecast} labels={['heute', 'in 30 Tagen']} highlight={0} unit="fällig" />
          </Card>
        </Section>

        <Section title="Kartenstatus">
          <Card className="p-4">
            <StackedBar
              segments={[
                { label: 'Neu', value: s.status.fresh, className: 'bg-ink-3/40' },
                { label: 'Lernend', value: s.status.learning, className: 'bg-warning' },
                { label: 'Beherrscht', value: s.status.mastered, className: 'bg-accent' },
              ]}
            />
          </Card>
        </Section>

        {data.exams.length > 0 && (
          <Section title="Prüfungssimulationen">
            <Card className="divide-y divide-line">
              {[...data.exams].reverse().slice(0, 5).map((e) => (
                <div key={e.date} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex size-10 items-center justify-center rounded-xl text-[18px] font-extrabold ${e.grade <= 2 ? 'bg-success/15 text-success' : e.grade <= 4 ? 'bg-warning/15 text-warning' : 'bg-danger/10 text-danger'}`}>
                    {e.grade}
                  </span>
                  <span className="flex-1 text-[14.5px]">
                    {e.percent} % · {e.questions} Fragen
                  </span>
                  <span className="text-[12.5px] text-ink-3">{new Date(e.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </Card>
          </Section>
        )}

        {topItems.length > 0 && (
          <Section title="Fortschritt nach Bereich">
            <Card className="divide-y divide-line">
              {topItems.map((i) => (
                <button key={i.id} onClick={() => navigate(i.kind === 'folder' ? `/ordner/${i.id}` : `/stapel/${i.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
                  <ItemIcon icon={i.icon} color={i.color} size={36} variant={i.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2 text-[14.5px]">
                      <span className="truncate font-medium">{i.name}</span>
                      <span className="shrink-0 tabular-nums text-ink-2">{Math.round(i.stats.progress * 100)} %</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <motion.span className="block h-full rounded-full accent-gradient" initial={{ width: 0 }} animate={{ width: `${i.stats.progress * 100}%` }} transition={{ duration: 0.8 }} />
                    </span>
                    <span className="mt-1 block text-[12px] text-ink-3">
                      {i.stats.total} {i.stats.total === 1 ? 'Abfrage' : 'Abfragen'} · {i.stats.due} fällig · {i.stats.newCount} neu
                    </span>
                  </span>
                </button>
              ))}
            </Card>
          </Section>
        )}

        <Section title={`Erfolge · ${unlocked}/${s.achievements.length}`}>
          <div className="grid grid-cols-3 gap-2.5">
            {s.achievements.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex flex-col items-center rounded-[20px] border p-3 text-center ${a.unlocked ? 'border-accent/30 bg-accent-soft' : 'border-line bg-surface'}`}
              >
                <span className={`relative mb-1.5 text-[30px] leading-none ${a.unlocked ? '' : 'opacity-35 grayscale'}`}>
                  {a.icon}
                  {!a.unlocked && <Lock size={12} className="absolute -bottom-0.5 -right-1.5 text-ink-3" />}
                </span>
                <span className="text-[12.5px] font-semibold leading-tight">{a.title}</span>
                <span className="mt-0.5 text-[10.5px] leading-tight text-ink-3">{a.description}</span>
                {!a.unlocked && a.progress > 0 && (
                  <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${a.progress * 100}%` }} />
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline justify-between px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
        {title}
        {hint && <span className="text-[11.5px] font-medium normal-case tracking-normal text-warning">{hint}</span>}
      </h2>
      {children}
    </section>
  )
}

function Tile({ icon: Icon, tint, value, unit, label }: { icon: LucideIcon; tint: string; value: string; unit?: string; label: string }) {
  return (
    <Card className="p-4">
      <Icon size={19} className={`mb-2 ${tint}`} />
      <p className="text-[24px] font-bold leading-none tracking-tight tabular-nums">
        {value} {unit && <span className="text-[13px] font-medium text-ink-3">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[12.5px] text-ink-2">{label}</p>
    </Card>
  )
}

