import { motion } from 'framer-motion'
import { ArrowRight, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/Button'
import type { Card } from '@/db/types'
import { CardFace } from '@/features/cards/CardFace'
import { expectedAnswer, type CheckResult } from '../answer'
import { answer } from '../session'
import type { SessionItem } from '../types'
import { AnswerInput } from './AnswerInput'
import { useCurrent } from './useCurrent'

/** Schreibmodus: Frage lesen, Antwort tippen, Vergleich sehen. */
export function WriteStudy() {
  const { item, card } = useCurrent()
  if (!item || !card) return <div className="flex-1" />
  return <WriteCard key={item.key} item={item} card={card} />
}

function WriteCard({ item, card }: { item: SessionItem; card: Card }) {
  const [checked, setChecked] = useState<{ result: CheckResult; input: string } | null>(null)
  const variant = { reverse: item.reverse, cloze: item.cloze }
  const expected = expectedAnswer(card, variant)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-area min-h-0 flex-1 space-y-4 px-5 pb-4 pt-2">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="rounded-[28px] border border-line bg-surface p-6 shadow-lift"
        >
          <CardFace card={card} side="front" variant={variant} />
        </motion.div>

        <AnswerInput expected={expected} checked={checked} autoFocus onChecked={(result, input) => setChecked({ result, input })} />

        {checked && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-[28px] border border-line bg-surface p-6 shadow-soft">
            <CardFace card={card} side="back" variant={variant} />
          </motion.div>
        )}
      </div>

      {checked && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 px-5 pb-[calc(var(--safe-bottom)+14px)] pt-2">
          {checked.result === 'wrong' && (
            <Button variant="secondary" className="flex-1" onClick={() => void answer(3, true)}>
              <ThumbsUp size={17} /> War richtig
            </Button>
          )}
          <Button className="flex-[1.4]" onClick={() => void answer(checked.result === 'wrong' ? 1 : 3, checked.result !== 'wrong')}>
            Weiter <ArrowRight size={18} />
          </Button>
        </motion.div>
      )}
    </div>
  )
}
