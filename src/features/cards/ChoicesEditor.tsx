import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, X } from 'lucide-react'
import type { Choice } from '@/db/types'
import { newChoice } from './model'

interface ChoicesEditorProps {
  choices: Choice[]
  onChange: (choices: Choice[]) => void
}

const MAX_CHOICES = 8

export function ChoicesEditor({ choices, onChange }: ChoicesEditorProps) {
  const update = (id: string, patch: Partial<Choice>) => onChange(choices.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {choices.map((c, i) => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={`flex items-center gap-2 rounded-2xl border bg-surface p-1.5 pl-2 transition-colors ${c.correct ? 'border-success/50' : 'border-line'}`}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => update(c.id, { correct: !c.correct })}
              aria-label={c.correct ? 'Als falsch markieren' : 'Als richtig markieren'}
              aria-pressed={c.correct}
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${c.correct ? 'border-success bg-success text-white' : 'border-line text-transparent'}`}
            >
              <Check size={18} strokeWidth={3} />
            </motion.button>
            <input
              value={c.text}
              onChange={(e) => update(c.id, { text: e.target.value })}
              placeholder={`Antwort ${i + 1}`}
              className="min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-ink-3"
            />
            {choices.length > 2 && (
              <button
                type="button"
                onClick={() => onChange(choices.filter((x) => x.id !== c.id))}
                aria-label={`Antwort ${i + 1} entfernen`}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-3 active:bg-surface-2"
              >
                <X size={17} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {choices.length < MAX_CHOICES && (
        <button
          type="button"
          onClick={() => onChange([...choices, newChoice()])}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-[14px] font-medium text-accent"
        >
          <Plus size={16} /> Antwort hinzufügen
        </button>
      )}
      <p className="px-1 text-[12.5px] text-ink-3">Tippe auf das Häkchen, um richtige Antworten zu markieren.</p>
    </div>
  )
}
