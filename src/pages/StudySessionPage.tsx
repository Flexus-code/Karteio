import { motion } from 'framer-motion'
import { Flag, MoreHorizontal, PartyPopper, Pause, Pencil, Timer, Undo2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ActionSheet } from '@/components/ActionSheet'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { setFlagged, setSuspended } from '@/features/cards/repo'
import { finishSession, resetSession, skipCurrent, startSession, undoLast, useSession } from '@/features/study/session'
import { MODE_INFO } from '@/features/study/types'
import { ExamStudy } from '@/features/study/ui/ExamStudy'
import { QuizStudy } from '@/features/study/ui/QuizStudy'
import { SessionSummary } from '@/features/study/ui/SessionSummary'
import { SwipeStudy } from '@/features/study/ui/SwipeStudy'
import { useCurrent } from '@/features/study/ui/useCurrent'
import { WriteStudy } from '@/features/study/ui/WriteStudy'
import { toast } from '@/store/toast'

export function StudySessionPage() {
  const navigate = useNavigate()
  const { config, queue, position, results, finished, undo, endsAt } = useSession()
  const { card } = useCurrent()
  const [confirmClose, setConfirmClose] = useState(false)
  const [menu, setMenu] = useState(false)

  if (!config) return <Navigate to="/lernen" replace />

  const mode = config.mode
  const close = () => {
    resetSession()
    navigate('/lernen', { replace: true })
  }

  // Leere Spaced-Repetition-Sitzung: alles erledigt
  if (finished && results.length === 0) {
    return (
      <div className="flex min-h-full flex-col justify-center pb-10">
        <EmptyState
          icon={PartyPopper}
          title="Alles erledigt!"
          text="Für heute sind keine Karten mehr fällig. Du kannst trotzdem frei üben."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => void startSession({ ...config, mode: 'free', limit: 20 }).then((n) => n === 0 && close())}>Frei üben</Button>
              <Button variant="ghost" onClick={close}>
                Zurück
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex h-full flex-col pt-safe">
        <SessionSummary />
      </div>
    )
  }

  const progress = queue.length ? position / queue.length : 0
  const Study = { srs: SwipeStudy, free: SwipeStudy, write: WriteStudy, quiz: QuizStudy, exam: ExamStudy }[mode]

  return (
    <div className="flex h-full flex-col">
      <header className="px-3 pb-2 pt-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => (results.length > 0 ? setConfirmClose(true) : close())}
            aria-label="Lernen beenden"
            className="flex size-11 items-center justify-center rounded-full text-ink-2 active:bg-surface-2"
          >
            <X size={22} />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <div className="mb-1 flex items-center justify-between text-[12.5px] font-medium text-ink-2">
              <span>{MODE_INFO[mode].label}</span>
              {endsAt ? <Countdown endsAt={endsAt} /> : <span className="tabular-nums">{Math.min(position + 1, queue.length)} / {queue.length}</span>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full rounded-full accent-gradient" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
            </div>
          </div>
          {mode !== 'exam' && (
            <button
              onClick={() => void undoLast()}
              disabled={undo.length === 0}
              aria-label="Letzte Bewertung rückgängig"
              className="flex size-11 items-center justify-center rounded-full text-ink-2 active:bg-surface-2 disabled:opacity-30"
            >
              <Undo2 size={20} />
            </button>
          )}
          <button onClick={() => setMenu(true)} aria-label="Karten-Aktionen" className="flex size-11 items-center justify-center rounded-full text-ink-2 active:bg-surface-2">
            <MoreHorizontal size={22} />
          </button>
        </div>
      </header>

      <Study />

      <ActionSheet
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        header={<p className="px-1 text-center text-[14px] text-ink-2">Dein Fortschritt bis hierhin ist gespeichert.</p>}
        actions={[
          { label: 'Zusammenfassung anzeigen', icon: Flag, onSelect: finishSession },
          { label: 'Lernen beenden', icon: X, danger: true, onSelect: close },
        ]}
      />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        actions={
          card
            ? [
                { label: 'Karte bearbeiten', icon: Pencil, onSelect: () => navigate(`/karte/${card.id}/bearbeiten`, { state: { returnTo: '/lernen/sitzung' } }) },
                {
                  label: card.flagged ? 'Markierung entfernen' : 'Karte markieren',
                  icon: Flag,
                  onSelect: () => void setFlagged([card.id], !card.flagged).then(() => toast(card.flagged ? 'Markierung entfernt' : 'Karte markiert', { tone: 'success' })),
                },
                {
                  label: 'Aussetzen (nicht mehr abfragen)',
                  icon: Pause,
                  onSelect: () =>
                    void setSuspended([card.id], true).then(() => {
                      skipCurrent()
                      toast('Karte ausgesetzt', { action: { label: 'Rückgängig', run: () => setSuspended([card.id], false) } })
                    }),
                },
              ]
            : []
        }
      />
    </div>
  )
}

function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, endsAt - now)
  useEffect(() => {
    if (left === 0) {
      toast('Die Zeit ist abgelaufen!')
      finishSession()
    }
  }, [left])
  const m = Math.floor(left / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  return (
    <span className={`flex items-center gap-1 tabular-nums ${left < 60_000 ? 'font-bold text-danger' : ''}`}>
      <Timer size={13} /> {m}:{String(s).padStart(2, '0')}
    </span>
  )
}
