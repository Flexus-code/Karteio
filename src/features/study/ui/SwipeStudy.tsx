import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { Lightbulb, RotateCw } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Card, CardState, Rating } from '@/db/types'
import { CardFace } from '@/features/cards/CardFace'
import { FlipCard } from '@/features/cards/FlipCard'
import { useSettings } from '@/store/settings'
import type { CheckResult } from '../answer'
import { expectedAnswer } from '../answer'
import { createScheduler, previewIntervals } from '../scheduler'
import { answer, useSession } from '../session'
import type { SessionItem } from '../types'
import { AnswerInput } from './AnswerInput'
import { ChoiceQuestion } from './ChoiceQuestion'
import { useCurrent } from './useCurrent'

const SWIPE = 110

const RATINGS: { rating: Rating; label: string; className: string; fly: { x: number; y: number } }[] = [
  { rating: 1, label: 'Nochmal', className: 'bg-danger/10 text-danger', fly: { x: -1, y: 0 } },
  { rating: 2, label: 'Schwer', className: 'bg-warning/15 text-warning', fly: { x: 0, y: 1 } },
  { rating: 3, label: 'Gut', className: 'bg-success/12 text-success', fly: { x: 1, y: 0 } },
  { rating: 4, label: 'Einfach', className: 'bg-accent-soft text-accent', fly: { x: 0, y: -1 } },
]

export function SwipeStudy() {
  const { item, card, state } = useCurrent()
  const remaining = useSession((s) => s.queue.length - s.position - 1)
  if (!item || !card) return <div className="flex-1" />
  return <SwipeCard key={item.key} item={item} card={card} state={state} remaining={remaining} />
}

interface SwipeCardProps {
  item: SessionItem
  card: Card
  state: CardState | undefined
  remaining: number
}

function SwipeCard({ item, card, state, remaining }: SwipeCardProps) {
  const mode = useSession((s) => s.config?.mode ?? 'srs')
  const retention = useSettings((s) => s.retention)
  const [flipped, setFlipped] = useState(false)
  const [hint, setHint] = useState(false)
  const [checked, setChecked] = useState<{ result: CheckResult; input: string } | null>(null)
  const [choiceCorrect, setChoiceCorrect] = useState<boolean | null>(null)
  const [canSwipeUp, setCanSwipeUp] = useState(true)
  const flying = useRef(false)
  const areaRef = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-16, 16])
  const goodOpacity = useTransform(x, [20, SWIPE], [0, 1])
  const againOpacity = useTransform(x, [-SWIPE, -20], [1, 0])
  const easyOpacity = useTransform(y, [-SWIPE, -20], [1, 0])

  const variant = { reverse: item.reverse, cloze: item.cloze }
  const needsInput = card.type === 'input' && !item.reverse
  const isChoice = card.type === 'choice'
  const interactive = needsInput || isChoice
  const answeredInteractive = needsInput ? checked !== null : isChoice ? choiceCorrect !== null : true

  const intervals = useMemo(
    () => (mode === 'srs' && state ? previewIntervals(createScheduler(retention), state) : null),
    [mode, state, retention],
  )

  // Hochwischen nur, wenn die Karte nicht gescrollt werden muss
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const check = () => setCanSwipeUp(el.scrollHeight <= el.clientHeight + 2)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [flipped])

  const suggested: Rating | null = needsInput && checked ? (checked.result === 'wrong' ? 1 : 3) : isChoice && choiceCorrect !== null ? (choiceCorrect ? 3 : 1) : null

  const rate = async (rating: Rating) => {
    if (flying.current) return
    flying.current = true
    const r = RATINGS.find((x) => x.rating === rating)!
    const w = window.innerWidth
    await Promise.all([
      animate(x, r.fly.x * w * 1.2, { duration: 0.32, ease: [0.4, 0, 1, 1] }),
      animate(y, r.fly.y * 700, { duration: 0.32, ease: [0.4, 0, 1, 1] }),
    ])
    const correct = needsInput && checked ? checked.result !== 'wrong' : isChoice && choiceCorrect !== null ? choiceCorrect : rating >= 3
    await answer(rating, correct)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x + info.velocity.x * 0.15
    const dy = info.offset.y + info.velocity.y * 0.15
    if (dx > SWIPE) void rate(3)
    else if (dx < -SWIPE) void rate(1)
    else if (canSwipeUp && dy < -SWIPE) void rate(4)
    else {
      void animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
      void animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 })
    }
  }

  // Tastatur: Leertaste dreht um, 1–4 bewerten
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.key === ' ' || e.key === 'Enter') && !flipped && !interactive) {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        const rating = Number(e.key) as Rating
        if (mode === 'srs' || rating === 1 || rating === 3) void rate(rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const buttons = mode === 'srs' ? RATINGS : RATINGS.filter((r) => r.rating === 1 || r.rating === 3)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={areaRef} className="scroll-area relative min-h-0 flex-1 px-5 pb-3 pt-2">
        <div className="flex min-h-full flex-col justify-center pb-6">
        <div className="relative">
          {/* Stapel dahinter */}
          {remaining > 0 && <div className="absolute inset-x-6 -bottom-3 top-6 rounded-[28px] border border-line bg-surface opacity-60 shadow-soft" />}
          {remaining > 1 && <div className="absolute inset-x-10 -bottom-6 top-10 rounded-[28px] border border-line bg-surface opacity-30" />}

          <motion.div
            style={{ x, y, rotate }}
            drag={flipped ? (canSwipeUp ? true : 'x') : false}
            dragElastic={0.9}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative"
          >
            <FlipCard
              flipped={flipped}
              onFlip={interactive && !answeredInteractive ? undefined : () => setFlipped((f) => !f)}
              front={<CardFace card={card} side="front" variant={variant} hideChoices={isChoice} />}
              back={<CardFace card={card} side="back" variant={variant} />}
            />
            {/* Wisch-Feedback */}
            <SwipeBadge opacity={goodOpacity} className="left-5 top-5 -rotate-12 border-success text-success" label="Gewusst" />
            <SwipeBadge opacity={againOpacity} className="right-5 top-5 rotate-12 border-danger text-danger" label="Nochmal" />
            {canSwipeUp && <SwipeBadge opacity={easyOpacity} className="bottom-5 left-1/2 -translate-x-1/2 border-accent text-accent" label="Einfach" />}
          </motion.div>
        </div>

        {!flipped && card.hint && (
          <div className="mt-4 flex justify-center">
            {hint ? (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl bg-warning/12 px-3.5 py-2 text-[14px]">
                <Lightbulb size={16} className="text-warning" /> {card.hint}
              </motion.p>
            ) : (
              <button onClick={() => setHint(true)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[14px] font-medium text-ink-2">
                <Lightbulb size={16} /> Hinweis zeigen
              </button>
            )}
          </div>
        )}

        {isChoice && (
          <div className="mt-4">
            <ChoiceQuestion
              options={card.choices ?? []}
              feedback
              answered={choiceCorrect !== null}
              onAnswered={(ok) => {
                setChoiceCorrect(ok)
                setTimeout(() => setFlipped(true), 650)
              }}
            />
          </div>
        )}
        {needsInput && (
          <div className="mt-4">
            <AnswerInput
              expected={expectedAnswer(card, variant)}
              checked={checked}
              autoFocus
              onChecked={(result, input) => {
                setChecked({ result, input })
                setTimeout(() => setFlipped(true), 400)
              }}
            />
          </div>
        )}
        </div>
      </div>

      <div className="px-5 pb-[calc(var(--safe-bottom)+14px)] pt-2">
        {flipped ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`grid gap-2 ${buttons.length === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {buttons.map((b) => (
              <motion.button
                key={b.rating}
                whileTap={{ scale: 0.94 }}
                onClick={() => void rate(b.rating)}
                className={`flex min-h-15 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[14.5px] font-semibold ${b.className} ${suggested === b.rating ? 'ring-2 ring-current' : ''}`}
              >
                {mode === 'srs' ? b.label : b.rating === 3 ? 'Gewusst' : 'Nochmal'}
                {intervals && <span className="mt-0.5 text-[11.5px] font-medium opacity-75">{intervals[b.rating]}</span>}
              </motion.button>
            ))}
          </motion.div>
        ) : interactive ? (
          <p className="py-4 text-center text-[13.5px] text-ink-3">{isChoice ? 'Wähle deine Antwort' : 'Tippe deine Antwort ein'}</p>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFlipped(true)}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl accent-gradient text-[16px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)]"
          >
            <RotateCw size={18} /> Antwort zeigen
          </motion.button>
        )}
        {flipped && <p className="mt-2 text-center text-[12px] text-ink-3">Tipp: Karte nach rechts (gewusst) oder links (nochmal) wischen</p>}
      </div>
    </div>
  )
}

function SwipeBadge({ opacity, className, label }: { opacity: ReturnType<typeof useTransform<number, number>>; className: string; label: string }) {
  return (
    <motion.span
      style={{ opacity }}
      className={`pointer-events-none absolute rounded-xl border-[3px] bg-surface/80 px-3 py-1 text-[18px] font-extrabold uppercase tracking-wider ${className}`}
    >
      {label}
    </motion.span>
  )
}
