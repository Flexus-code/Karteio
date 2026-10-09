import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import type { Card } from '@/db/types'
import { CardFace } from '@/features/cards/CardFace'
import { expectedAnswer } from '../answer'
import { answer, useSession } from '../session'
import { buildQuizOptions } from '../select'
import type { SessionItem } from '../types'
import { ChoiceQuestion, type Option } from './ChoiceQuestion'
import { useCurrent } from './useCurrent'

/** Antwortoptionen einer Karte – eigene bei Multiple-Choice-Karten, sonst aus anderen Karten erzeugt. */
export function optionsFor(card: Card, item: SessionItem, pool: string[]): Option[] {
  if (card.type === 'choice') return (card.choices ?? []).filter((c) => c.text.trim())
  const correct = expectedAnswer(card, { reverse: item.reverse, cloze: item.cloze })
  return buildQuizOptions(correct, pool).map((text, i) => ({ id: `${i}`, text, correct: text === correct }))
}

export function QuizStudy() {
  const { item, card } = useCurrent()
  if (!item || !card) return <div className="flex-1" />
  return <QuizCard key={item.key} item={item} card={card} />
}

function QuizCard({ item, card }: { item: SessionItem; card: Card }) {
  const pool = useSession((s) => s.pool)
  // Optionen nur einmal pro Frage erzeugen (sonst würden sie beim Neuzeichnen springen)
  const options = useMemo(() => optionsFor(card, item, pool), [item.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<boolean | null>(null)
  const variant = { reverse: item.reverse, cloze: item.cloze }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-area min-h-0 flex-1 space-y-4 px-5 pb-4 pt-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[28px] border border-line bg-surface p-6 shadow-lift"
        >
          <CardFace card={card} side="front" variant={variant} hideChoices />
        </motion.div>
        <ChoiceQuestion options={options} feedback answered={result !== null} onAnswered={setResult} />
        {result !== null && card.notes && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-warning/12 px-3.5 py-2.5 text-[14px]">
            💡 {card.notes}
          </motion.p>
        )}
      </div>
      {result !== null && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-5 pb-[calc(var(--safe-bottom)+14px)] pt-2">
          <Button block onClick={() => void answer(result ? 3 : 1, result)}>
            {result ? 'Richtig – weiter' : 'Weiter'} <ArrowRight size={18} />
          </Button>
        </motion.div>
      )}
    </div>
  )
}
