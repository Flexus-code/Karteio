import { motion } from 'framer-motion'
import { Brackets, CheckSquare, Keyboard, Repeat, StickyNote, type LucideIcon } from 'lucide-react'
import type { CardType } from '@/db/types'
import { CARD_TYPES } from './model'

export const TYPE_ICONS: Record<CardType, LucideIcon> = {
  basic: StickyNote,
  reversible: Repeat,
  cloze: Brackets,
  choice: CheckSquare,
  input: Keyboard,
}

interface TypePickerProps {
  value: CardType
  onChange: (type: CardType) => void
}

export function TypePicker({ value, onChange }: TypePickerProps) {
  const current = CARD_TYPES.find((t) => t.type === value)
  return (
    <div>
      <div role="radiogroup" aria-label="Kartentyp" className="scroll-area -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {CARD_TYPES.map((t) => {
          const active = t.type === value
          const Icon = TYPE_ICONS[t.type]
          return (
            <motion.button
              key={t.type}
              type="button"
              role="radio"
              aria-checked={active}
              whileTap={{ scale: 0.94 }}
              onClick={() => onChange(t.type)}
              className={`relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors ${active ? 'text-white' : 'bg-surface text-ink-2 shadow-soft'}`}
            >
              {active && (
                <motion.span
                  layoutId="type-pill"
                  className="absolute inset-0 rounded-full accent-gradient"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <Icon size={16} className="relative" />
              <span className="relative">{t.label}</span>
            </motion.button>
          )
        })}
      </div>
      <motion.p key={value} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 px-1 text-[13px] text-ink-2">
        {current?.description}
      </motion.p>
    </div>
  )
}
