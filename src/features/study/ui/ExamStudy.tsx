import { motion } from 'framer-motion'
import { Check, Eye, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import type { Card } from '@/db/types'
import { CardFace } from '@/features/cards/CardFace'
import { answer, useSession } from '../session'
import type { SessionItem } from '../types'
import { ChoiceQuestion } from './ChoiceQuestion'
import { optionsFor } from './QuizStudy'
import { useCurrent } from './useCurrent'

/**
 * Prüfungssimulation: keine Hinweise, kein Feedback während der Prüfung.
 * Multiple-Choice-Karten werden automatisch gewertet, andere ehrlich selbst bewertet.
 */
export function ExamStudy() {
  const { item, card } = useCurrent()
  if (!item || !card) return <div className="flex-1" />
  return <ExamCard key={item.key} item={item} card={card} />
}

function ExamCard({ item, card }: { item: SessionItem; card: Card }) {
  const pool = useSession((s) => s.pool)
  const isChoice = card.type === 'choice'
  const options = useMemo(() => (isChoice ? optionsFor(card, item, pool) : []), [item.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [revealed, setRevealed] = useState(false)
  const variant = { reverse: item.reverse, cloze: item.cloze }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-area min-h-0 flex-1 space-y-4 px-5 pb-4 pt-2">
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="rounded-[28px] border border-line bg-surface p-6 shadow-lift">
          <CardFace card={card} side="front" variant={variant} hideChoices />
        </motion.div>
        {isChoice && <ChoiceQuestion options={options} feedback={false} answered={false} onAnswered={(ok) => void answer(ok ? 3 : 1, ok)} />}
        {!isChoice && revealed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-line bg-surface p-6 shadow-soft">
            <CardFace card={card} side="back" variant={variant} />
          </motion.div>
        )}
      </div>

      {!isChoice && (
        <div className="px-5 pb-[calc(var(--safe-bottom)+14px)] pt-2">
          {revealed ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="mb-2 text-center text-[13px] text-ink-2">Ehrlich sein: Hättest du das in der Prüfung gewusst?</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="danger" onClick={() => void answer(1, false)}>
                  <X size={18} /> Nicht gewusst
                </Button>
                <Button variant="success" onClick={() => void answer(3, true)}>
                  <Check size={18} /> Gewusst
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button block onClick={() => setRevealed(true)}>
              <Eye size={18} /> Lösung zeigen
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
