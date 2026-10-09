import { AnimatePresence, motion } from 'framer-motion'
import { CloudUpload, X } from 'lucide-react'
import { useState } from 'react'
import { lastBackupAt } from './backup'
import { runBackup } from './DataSection'

const SNOOZE = 'karteio-backup-snooze'
const WEEK = 7 * 86_400_000

function shouldRemind() {
  const last = lastBackupAt()
  const snoozed = Number(localStorage.getItem(SNOOZE)) || 0
  return Date.now() - snoozed > 86_400_000 && (!last || Date.now() - last > WEEK)
}

/** Hinweis auf der Startseite, wenn das letzte Backup älter als 7 Tage ist. */
export function BackupReminder({ hasCards }: { hasCards: boolean }) {
  const [visible, setVisible] = useState(shouldRemind)
  const last = lastBackupAt()

  return (
    <AnimatePresence>
      {hasCards && visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-[22px] border border-warning/30 bg-warning/10 p-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
              <CloudUpload size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold">Zeit für ein Backup</p>
              <p className="text-[12.5px] leading-snug text-ink-2">{last ? 'Dein letztes Backup ist über eine Woche alt.' : 'Sichere deine Karten, damit nichts verloren geht.'}</p>
            </div>
            <button
              onClick={() => void runBackup().then((ok) => ok && setVisible(false))}
              className="h-9 shrink-0 rounded-xl bg-warning px-3 text-[13px] font-semibold text-white"
            >
              Sichern
            </button>
            <button
              onClick={() => {
                localStorage.setItem(SNOOZE, String(Date.now()))
                setVisible(false)
              }}
              aria-label="Später erinnern"
              className="flex size-8 shrink-0 items-center justify-center text-ink-3"
            >
              <X size={17} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
