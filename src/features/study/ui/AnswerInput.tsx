import { motion } from 'framer-motion'
import { CheckCircle2, CircleAlert, CircleX, CornerDownLeft } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '@/store/settings'
import { checkAnswer, diffChars, type CheckResult } from '../answer'

interface AnswerInputProps {
  expected: string
  /** Wird nach dem Prüfen aufgerufen */
  onChecked: (result: CheckResult, input: string) => void
  /** Ohne Eingabe: nur die Lösung aufdecken (selbst bewerten) */
  onReveal: () => void
  checked: { result: CheckResult; input: string } | null
  autoFocus?: boolean
}

const RESULT_UI: Record<CheckResult, { label: string; icon: typeof CheckCircle2; className: string }> = {
  correct: { label: 'Richtig!', icon: CheckCircle2, className: 'bg-success/12 text-success' },
  close: { label: 'Fast richtig – kleiner Tippfehler', icon: CircleAlert, className: 'bg-warning/15 text-warning' },
  wrong: { label: 'Leider falsch', icon: CircleX, className: 'bg-danger/10 text-danger' },
}

/** Eingabefeld für Antworten mit Vergleich und farbiger Hervorhebung der Abweichungen. */
export function AnswerInput({ expected, onChecked, onReveal, checked, autoFocus }: AnswerInputProps) {
  const [value, setValue] = useState('')
  const tolerant = useSettings((s) => s.typoTolerance)

  const submit = () => {
    if (checked) return
    if (!value.trim()) onReveal()
    else onChecked(checkAnswer(value, expected, tolerant), value)
  }

  if (checked) {
    const ui = RESULT_UI[checked.result]
    const Icon = ui.icon
    const diff = diffChars(checked.input.trim(), expected)
    // Bei völlig anderer Antwort ist ein Buchstabenvergleich unleserlich
    const similar = diff.filter((p) => p.kind === 'same').reduce((n, p) => n + p.text.length, 0) >= expected.length * 0.5
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: [0.95, 1.03, 1] }}
          className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold ${ui.className}`}
        >
          <Icon size={19} /> {ui.label}
        </motion.div>
        {checked.result !== 'correct' && !similar && (
          <div className="rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[15px]">
            <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Richtige Antwort</p>
            <p className="font-medium text-success">{expected}</p>
          </div>
        )}
        {checked.result !== 'correct' && similar && checked.input.trim() && (
          <div className="rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed">
            <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Deine Antwort im Vergleich</p>
            <p className="break-words">
              {diff.map((p, i) => (
                <span
                  key={i}
                  className={
                    p.kind === 'missing'
                      ? 'rounded bg-success/20 text-success underline decoration-dotted'
                      : p.kind === 'extra'
                        ? 'rounded bg-danger/15 text-danger line-through'
                        : ''
                  }
                >
                  {p.text}
                </span>
              ))}
            </p>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-4 focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]"
    >
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Deine Antwort …"
        aria-label="Deine Antwort"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-ink-3"
      />
      <button type="submit" className="flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-[14px] font-semibold text-white">
        {value.trim() ? 'Prüfen' : 'Lösung zeigen'} <CornerDownLeft size={15} />
      </button>
    </form>
  )
}
