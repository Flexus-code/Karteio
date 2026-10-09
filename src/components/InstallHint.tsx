import { AnimatePresence, motion } from 'framer-motion'
import { Share, SquarePlus, X } from 'lucide-react'
import { useState } from 'react'
import { isIOS, isStandalone } from '@/lib/platform'
import { useUiStore } from '@/store/ui'
import { Button } from './Button'

const STEPS = [
  <>
    Tippe unten in Safari auf <Share size={16} className="inline align-[-2px] text-accent" /> <b>Teilen</b>
  </>,
  <>
    Wähle <SquarePlus size={16} className="inline align-[-2px] text-accent" /> <b>Zum Home-Bildschirm</b>
  </>,
  <>Starte Karteio über das neue App-Icon</>,
]

/** Anleitung zur Installation, wenn die App im normalen Safari-Tab läuft. */
export function InstallHint() {
  const dismissed = useUiStore((s) => s.installHintDismissed)
  const dismiss = useUiStore((s) => s.dismissInstallHint)
  const [show] = useState(() => isIOS() && !isStandalone())

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <motion.div
          className="absolute inset-0 z-40 flex items-end bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            role="dialog"
            aria-labelledby="install-title"
            className="w-full rounded-t-[28px] bg-elevated px-6 pb-[calc(var(--safe-bottom)+24px)] pt-3 shadow-lift"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-surface-2" />
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src="./logo.svg" alt="" className="size-14 rounded-2xl shadow-soft" />
                <div>
                  <h2 id="install-title" className="text-lg font-semibold">
                    Karteio installieren
                  </h2>
                  <p className="text-[13.5px] text-ink-2">Vollbild, offline und wie eine echte App</p>
                </div>
              </div>
              <button onClick={dismiss} aria-label="Schließen" className="flex size-9 items-center justify-center text-ink-3">
                <X size={20} />
              </button>
            </div>
            <ol className="mb-6 space-y-3 text-[15px]">
              {STEPS.map((step, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1">{step}</span>
                </li>
              ))}
            </ol>
            <Button block onClick={dismiss}>
              Verstanden
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
