import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}

/** Zahl mit −/+ als ganze Einstellungszeile */
export function Stepper({ label, description, value, onChange, min, max, step }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        {description && <span className="block text-[12.5px] text-ink-3">{description}</span>}
      </span>
      <div className="flex items-center rounded-xl bg-surface-2">
        <button type="button" aria-label={`${label} verringern`} disabled={value <= min} onClick={() => set(value - step)} className="flex size-9 items-center justify-center text-accent disabled:opacity-30">
          <Minus size={16} />
        </button>
        <motion.span key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-10 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
          {value}
        </motion.span>
        <button type="button" aria-label={`${label} erhöhen`} disabled={value >= max} onClick={() => set(value + step)} className="flex size-9 items-center justify-center text-accent disabled:opacity-30">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
