import { AnimatePresence, motion } from 'framer-motion'
import { Hash, X } from 'lucide-react'
import { useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}

export function TagInput({ tags, onChange, suggestions }: TagInputProps) {
  const [value, setValue] = useState('')

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '').replace(/\s+/g, '-')
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setValue('')
  }

  const query = value.trim().toLowerCase()
  const matches = suggestions.filter((s) => !tags.includes(s) && (!query || s.toLowerCase().includes(query))).slice(0, 8)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface px-2.5 py-2 focus-within:border-accent">
        <AnimatePresence initial={false}>
          {tags.map((t) => (
            <motion.span
              key={t}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-2.5 pr-1 text-[13.5px] font-medium text-accent"
            >
              #{t}
              <button
                type="button"
                aria-label={`Schlagwort ${t} entfernen`}
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="flex size-6 items-center justify-center rounded-full active:bg-accent/15"
              >
                <X size={13} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/[,;]$/.test(v)) add(v.slice(0, -1))
            else setValue(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(value)
            } else if (e.key === 'Backspace' && !value && tags.length) {
              onChange(tags.slice(0, -1))
            }
          }}
          onBlur={() => value.trim() && add(value)}
          placeholder={tags.length ? '' : 'Schlagwort hinzufügen'}
          enterKeyHint="done"
          autoCapitalize="off"
          className="min-w-[120px] flex-1 bg-transparent py-1 text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      {matches.length > 0 && (
        <div className="scroll-area mt-2 flex gap-1.5 overflow-x-auto">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink-2"
            >
              <Hash size={12} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
