import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/Card'
import { checkForUpdate, useUpdateStore } from '@/store/update'
import { toast } from '@/store/toast'

const buildDate = new Date(__BUILD_TIME__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

/** Versionsanzeige mit Update-Hinweis und „Nach Updates suchen“ in den Einstellungen */
export function UpdateCard() {
  const needRefresh = useUpdateStore((s) => s.needRefresh)
  const apply = useUpdateStore((s) => s.apply)
  const [checking, setChecking] = useState(false)
  const [upToDate, setUpToDate] = useState(false)

  const check = async () => {
    setChecking(true)
    setUpToDate(false)
    try {
      const result = await checkForUpdate()
      if (result === null) toast('Update-Prüfung ist nur in der installierten App und mit Internet möglich.')
      else if (!result) setUpToDate(true)
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <AnimatePresence initial={false}>
        {needRefresh && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-warning/10 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
                <Download size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Du nutzt eine alte Version</p>
                <p className="text-[12.5px] leading-snug text-ink-2">Eine neue Version von Karteio ist bereit. Deine Karten bleiben erhalten.</p>
              </div>
            </div>
            <div className="border-b border-line p-3">
              <button
                onClick={() => void apply?.()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl accent-gradient text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_var(--accent)]"
              >
                <RefreshCw size={18} /> Jetzt aktualisieren
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-12 items-center justify-between px-4 text-[15px]">
        <span>Version</span>
        <span className="text-right text-ink-2">
          {__APP_VERSION__} <span className="text-[12.5px] text-ink-3">· {buildDate}</span>
        </span>
      </div>
      {!needRefresh && (
        <button
          onClick={() => void check()}
          disabled={checking}
          className="flex min-h-12 w-full items-center gap-3 border-t border-line px-4 text-left text-[15px] active:bg-surface-2 disabled:opacity-60"
        >
          {checking ? <Loader2 size={18} className="animate-spin text-accent" /> : upToDate ? <CheckCircle2 size={18} className="text-success" /> : <RefreshCw size={18} className="text-accent" />}
          <span className="flex-1">{checking ? 'Suche nach Updates …' : upToDate ? 'Du hast die neueste Version' : 'Nach Updates suchen'}</span>
        </button>
      )}
    </Card>
  )
}
