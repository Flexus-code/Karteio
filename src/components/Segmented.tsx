import { motion } from 'framer-motion'
import { useId } from 'react'

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}

/** iOS-artiger Segment-Schalter mit gleitendem Indikator. */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: SegmentedProps<T>) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-[14px] bg-surface-2 p-1">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative min-h-9 flex-1 rounded-[10px] text-[14px] font-medium transition-colors ${active ? 'text-ink' : 'text-ink-2'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[10px] bg-surface shadow-soft dark:bg-[#2c2c38]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
