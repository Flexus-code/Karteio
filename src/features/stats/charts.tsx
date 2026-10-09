import { motion } from 'framer-motion'
import { useState } from 'react'
import type { heatmapWeeks } from './compute'

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const fmtDay = (d: Date) => d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

/** Intensitätsstufe 0–4 relativ zum Tagesziel */
function level(count: number, goal: number) {
  if (count === 0) return 0
  const r = count / Math.max(1, goal)
  return r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4
}
const LEVEL_OPACITY = [0, 0.25, 0.5, 0.75, 1]

/** Lernkalender im GitHub-Stil */
export function Heatmap({ weeks, goal }: { weeks: ReturnType<typeof heatmapWeeks>; goal: number }) {
  const [picked, setPicked] = useState<{ date: Date; count: number } | null>(null)
  const last = weeks.at(-1)?.find((d) => !d.future)

  return (
    <div>
      <div className="flex gap-[3px]">
        <div className="mr-1 flex flex-col justify-between py-[2px] text-[9.5px] leading-none text-ink-3">
          <span>Mo</span>
          <span>Mi</span>
          <span>Fr</span>
          <span>So</span>
        </div>
        {weeks.map((col, w) => (
          <div key={w} className="flex flex-1 flex-col gap-[3px]">
            {col.map((d) => {
              const lv = level(d.count, goal)
              return (
                <motion.button
                  key={d.date.toISOString()}
                  type="button"
                  disabled={d.future}
                  onClick={() => setPicked({ date: d.date, count: d.count })}
                  aria-label={`${fmtDay(d.date)}: ${d.count} Antworten`}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: d.future ? 0 : 1, scale: 1 }}
                  transition={{ delay: w * 0.015 }}
                  className={`relative aspect-square w-full overflow-hidden rounded-[4px] bg-surface-2 ${picked?.date.getTime() === d.date.getTime() ? 'ring-2 ring-ink/40' : ''}`}
                >
                  {lv > 0 && <span className="absolute inset-0 bg-accent" style={{ opacity: LEVEL_OPACITY[lv] }} />}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
        <span>
          {picked ? (
            <>
              <b className="text-ink-2">{fmtDay(picked.date)}</b>: {picked.count} {picked.count === 1 ? 'Antwort' : 'Antworten'}
            </>
          ) : (
            `${MONTHS[weeks[0]![0]!.date.getMonth()]} – ${last ? MONTHS[last.date.getMonth()] : ''}`
          )}
        </span>
        <span className="flex items-center gap-1">
          weniger
          {LEVEL_OPACITY.map((o, i) => (
            <span key={i} className="relative size-2.5 overflow-hidden rounded-[3px] bg-surface-2">
              {i > 0 && <span className="absolute inset-0 bg-accent" style={{ opacity: o }} />}
            </span>
          ))}
          mehr
        </span>
      </div>
    </div>
  )
}

interface BarChartProps {
  values: number[]
  labels: [string, string]
  /** Index, der hervorgehoben wird (z. B. heute) */
  highlight?: number
  unit: string
  height?: number
}

/** Einfaches, animiertes Balkendiagramm */
export function BarChart({ values, labels, highlight, unit, height = 110 }: BarChartProps) {
  const [picked, setPicked] = useState<number | null>(null)
  const max = Math.max(1, ...values)
  const shown = picked ?? highlight ?? values.length - 1

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tabular-nums">{values[shown] ?? 0}</span>
        <span className="text-[12.5px] text-ink-2">{unit}</span>
      </div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {values.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPicked(i)}
            aria-label={`${v} ${unit}`}
            className="flex h-full flex-1 items-end"
          >
            <motion.span
              className={`block w-full rounded-t-[4px] ${i === shown ? 'bg-accent' : 'bg-accent/35'}`}
              initial={{ height: 0 }}
              animate={{ height: v === 0 ? 2 : `${Math.max(4, (v / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.012, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </div>
  )
}

interface Segment {
  label: string
  value: number
  className: string
}

/** Gestapelter Balken mit Legende (z. B. neu / lernend / beherrscht) */
export function StackedBar({ segments }: { segments: Segment[] }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
  return (
    <div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-surface-2">
        {segments.map((s, i) => (
          <motion.span
            key={s.label}
            className={`h-full ${s.className}`}
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {segments.map((s) => (
          <div key={s.label}>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <span className={`size-2.5 rounded-full ${s.className}`} /> {s.label}
            </div>
            <p className="text-[18px] font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
