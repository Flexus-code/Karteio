import { motion } from 'framer-motion'
import { Check, Flag, PauseCircle } from 'lucide-react'
import type { Card } from '@/db/types'
import { useLongPress } from '@/lib/useLongPress'
import { stripCloze } from './cloze'
import { cardTypeLabel } from './model'
import { docToText } from './richtext'
import { TYPE_ICONS } from './TypePicker'

interface CardRowProps {
  card: Card
  selecting: boolean
  selected: boolean
  onOpen: () => void
  onToggle: () => void
  onMenu: () => void
}

export function cardPreviewText(card: Card) {
  const front = stripCloze(docToText(card.front)).replace(/\n/g, ' ')
  const back =
    card.type === 'choice'
      ? (card.choices ?? []).filter((c) => c.correct).map((c) => c.text).join(', ')
      : docToText(card.back).replace(/\n/g, ' ')
  return { front, back }
}

export function CardRow({ card, selecting, selected, onOpen, onToggle, onMenu }: CardRowProps) {
  const { handlers, wasLongPress } = useLongPress(onMenu)
  const { front, back } = cardPreviewText(card)
  const Icon = TYPE_ICONS[card.type]

  return (
    <motion.button
      type="button"
      layout="position"
      whileTap={{ scale: 0.985 }}
      {...(selecting ? {} : handlers)}
      onClick={() => !wasLongPress() && (selecting ? onToggle() : onOpen())}
      aria-pressed={selecting ? selected : undefined}
      className={`card-row flex w-full items-start gap-3 rounded-[20px] border bg-surface p-3.5 text-left shadow-soft transition-colors ${selected ? 'border-accent' : 'border-line'} ${card.suspended ? 'opacity-60' : ''}`}
    >
      {selecting ? (
        <span
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? 'border-accent bg-accent text-white' : 'border-line'}`}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
      ) : (
        <span title={cardTypeLabel(card.type)} className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={15} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-medium leading-snug">{front || '(leer)'}</span>
        {back && <span className="mt-0.5 line-clamp-1 block text-[13.5px] text-ink-2">{back}</span>}
        {card.tags.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {card.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-ink-2">
                #{t}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        {card.flagged && <Flag size={15} className="fill-warning text-warning" aria-label="Markiert" />}
        {card.suspended && <PauseCircle size={15} className="text-ink-3" aria-label="Ausgesetzt" />}
      </span>
    </motion.button>
  )
}
