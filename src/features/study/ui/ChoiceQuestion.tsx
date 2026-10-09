import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/Button'

export interface Option {
  id: string
  text: string
  correct: boolean
}

interface ChoiceQuestionProps {
  options: Option[]
  /** Nach dem Antworten richtige/falsche Antworten anzeigen (im Prüfungsmodus aus) */
  feedback: boolean
  onAnswered: (correct: boolean) => void
  answered: boolean
}

/**
 * Interaktive Antwortauswahl. Bei einer richtigen Antwort genügt ein Tipp,
 * bei mehreren richtigen wird erst nach „Prüfen“ ausgewertet.
 */
export function ChoiceQuestion({ options, feedback, onAnswered, answered }: ChoiceQuestionProps) {
  const multi = options.filter((o) => o.correct).length > 1
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const evaluate = (sel: Set<string>) => options.every((o) => o.correct === sel.has(o.id))

  const tap = (id: string) => {
    if (answered) return
    if (!multi) {
      const sel = new Set([id])
      setPicked(sel)
      onAnswered(evaluate(sel))
      return
    }
    setPicked((p) => {
      const next = new Set(p)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2.5">
      {multi && !answered && <p className="px-1 text-[13px] text-ink-2">Mehrere Antworten sind richtig.</p>}
      {options.map((o, i) => {
        const isPicked = picked.has(o.id)
        const reveal = answered && feedback
        const state = reveal ? (o.correct ? 'correct' : isPicked ? 'wrong' : 'idle') : isPicked ? 'picked' : 'idle'
        const styles = {
          correct: 'border-success bg-success/12 text-ink',
          wrong: 'border-danger bg-danger/10 text-ink',
          picked: 'border-accent bg-accent-soft',
          idle: 'border-line bg-surface',
        }[state]
        return (
          <motion.button
            key={o.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={state === 'wrong' ? { opacity: 1, y: 0, x: [0, -6, 6, -3, 0] } : { opacity: 1, y: 0 }}
            transition={{ delay: answered ? 0 : i * 0.05 }}
            whileTap={answered ? undefined : { scale: 0.98 }}
            onClick={() => tap(o.id)}
            disabled={answered}
            className={`flex min-h-13 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15.5px] shadow-soft transition-colors ${styles}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                state === 'correct' ? 'bg-success text-white' : state === 'wrong' ? 'bg-danger text-white' : state === 'picked' ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'
              }`}
            >
              {state === 'correct' ? <Check size={15} strokeWidth={3} /> : state === 'wrong' ? <X size={15} strokeWidth={3} /> : String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{o.text}</span>
          </motion.button>
        )
      })}
      {multi && !answered && (
        <Button block disabled={picked.size === 0} onClick={() => onAnswered(evaluate(picked))}>
          {feedback ? 'Prüfen' : 'Antwort abgeben'}
        </Button>
      )}
    </div>
  )
}
