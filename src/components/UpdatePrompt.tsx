import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useUpdateStore } from '@/store/update'

/** Registriert den Service Worker und zeigt einen Hinweis, sobald eine neue App-Version bereitsteht. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      useUpdateStore.setState({ registration })
      // Stündlich und beim Zurückkehren in die App nach Updates suchen
      setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => undefined)
      })
    },
  })
  const dismissed = useUpdateStore((s) => s.dismissed)

  /** Neue Version aktivieren und neu laden – mit Rückfall, falls das Signal des Service Workers ausbleibt */
  const apply = useCallback(async () => {
    setTimeout(() => location.reload(), 2500)
    await updateServiceWorker(true)
  }, [updateServiceWorker])

  useEffect(() => {
    useUpdateStore.setState({ needRefresh, apply })
  }, [needRefresh, apply])

  return (
    <AnimatePresence>
      {needRefresh && !dismissed && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="glass absolute inset-x-3 top-[calc(var(--safe-top)+8px)] z-50 flex items-center gap-3 rounded-2xl border border-line p-3 shadow-lift"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl accent-gradient text-white">
            <RefreshCw size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">Neue Version verfügbar</p>
            <p className="text-[12.5px] text-ink-2">Tippe auf Aktualisieren.</p>
          </div>
          <button onClick={() => void apply()} className="rounded-xl bg-accent px-3 py-2 text-[13px] font-semibold text-white">
            Aktualisieren
          </button>
          <button
            onClick={() => useUpdateStore.setState({ dismissed: true })}
            aria-label="Hinweis schließen"
            className="flex size-9 items-center justify-center rounded-xl text-ink-3"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
