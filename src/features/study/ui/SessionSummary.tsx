import confetti from 'canvas-confetti'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Layers, PartyPopper, RotateCcw, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ProgressRing } from '@/components/ProgressRing'
import { db } from '@/db/db'
import { cardPreviewText } from '@/features/cards/CardRow'
import { ihkGrade } from '../answer'
import { DeckPath } from '@/features/library/DeckPath'
import { saveExamResult } from '@/features/stats/useStatsData'
import { resetSession, startSession, useSession } from '../session'

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} Sek.`
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')} Min.`
}

export function SessionSummary() {
  const navigate = useNavigate()
  const { config, results, queue, startedAt, round } = useSession()
  const [elapsed] = useState(() => Date.now() - startedAt)
  const mode = config?.mode ?? 'srs'
  const isExam = mode === 'exam'

  const correct = results.filter((r) => r.correct).length
  // In der Prüfung zählen unbeantwortete Fragen als falsch
  const total = isExam ? queue.length : results.length
  const percent = total ? Math.round((correct / total) * 100) : 0
  const grade = ihkGrade(percent)

  const wrongItems = useMemo(() => {
    const keys = new Set(results.filter((r) => !r.correct).map((r) => r.stateId))
    const answered = new Set(results.map((r) => r.key))
    const unanswered = isExam ? queue.filter((q) => !answered.has(q.key)).map((q) => q.stateId) : []
    unanswered.forEach((k) => keys.add(k))
    const seen = new Set<string>()
    return queue.filter((q) => keys.has(q.stateId) && !seen.has(q.stateId) && seen.add(q.stateId))
  }, [results, queue, isExam])

  const wrongCards = useLiveQuery(() => db.cards.bulkGet([...new Set(wrongItems.map((w) => w.cardId))]), [wrongItems])

  // Prüfungsergebnis für Statistik und Erfolge merken
  useEffect(() => {
    if (!isExam || results.length === 0) return
    void saveExamResult({ date: Date.now(), percent, grade: grade.grade, questions: total })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results.length === 0) return
    const strong = percent >= 60
    void confetti({
      particleCount: strong ? 140 : 50,
      spread: strong ? 90 : 60,
      origin: { y: 0.35 },
      disableForReducedMotion: true,
      colors: ['#15803d', '#0f766e', '#22c55e', '#f59e0b', '#e11d48'],
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    resetSession()
    navigate('/lernen', { replace: true })
  }

  const retry = async () => {
    if (!config) return
    // Wiederholungsrunden ändern den Lernplan nicht mehr (die Bewertung „Nochmal“ ist schon gespeichert)
    const n = await startSession(
      { ...config, mode: mode === 'srs' || mode === 'exam' ? 'free' : mode },
      wrongItems.map((w, i) => ({ ...w, key: `${w.stateId}#r${round + 1}-${i}` })),
      round + 1,
    )
    if (n === 0) close()
  }

  const message = isExam
    ? `Note ${grade.grade} – ${grade.label}`
    : round > 1 && wrongItems.length === 0
      ? 'Jetzt sitzen alle!'
      : percent >= 90
      ? 'Hervorragend!'
      : percent >= 70
        ? 'Stark gemacht!'
        : percent >= 50
          ? 'Gut dabei – dranbleiben!'
          : 'Übung macht den Meister!'

  return (
    <div className="scroll-area flex-1 px-5 pb-[calc(var(--safe-bottom)+20px)] pt-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="flex flex-col items-center text-center">
        <div className="text-accent">
          <ProgressRing value={percent / 100} size={150} stroke={13} trackClassName="stroke-surface-2">
            {isExam ? (
              <>
                <span className="text-[44px] font-extrabold leading-none text-ink">{grade.grade}</span>
                <span className="mt-1 text-[12px] font-medium text-ink-2">{percent} %</span>
              </>
            ) : (
              <>
                <span className="text-[34px] font-extrabold leading-none text-ink">{percent}%</span>
                <span className="mt-1 text-[12px] font-medium text-ink-2">richtig</span>
              </>
            )}
          </ProgressRing>
        </div>
        <h1 className="mt-5 flex items-center gap-2 font-display text-[26px] font-bold tracking-tight">
          {message} {!isExam && <PartyPopper size={24} className="text-warning" />}
        </h1>
        <p className="mt-1 text-[14.5px] text-ink-2">
          {isExam ? `${correct} von ${total} Fragen richtig` : round > 1 ? `Wiederholungsrunde ${round - 1} abgeschlossen` : 'Lerneinheit abgeschlossen'}
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 grid grid-cols-3 gap-3">
        <Tile icon={Layers} value={`${results.length}`} label="Antworten" />
        <Tile icon={CheckCircle2} value={`${correct}`} label="Richtig" />
        <Tile icon={Clock} value={formatDuration(elapsed)} label="Zeit" />
      </motion.div>

      <div className="mt-6 space-y-2.5">
        {wrongItems.length > 0 && (
          <Button block onClick={() => void retry()}>
            <RotateCcw size={18} /> {wrongItems.length === 1 ? '1 nicht gewusste Karte wiederholen' : `${wrongItems.length} nicht gewusste Karten wiederholen`}
          </Button>
        )}
        <Button block variant={wrongItems.length > 0 ? 'secondary' : 'primary'} onClick={close}>
          Fertig
        </Button>
      </div>

      {wrongItems.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-7">
          <h2 className="mb-2.5 flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
            <Target size={14} /> Nicht gewusst ({wrongItems.length})
          </h2>
          <Card className="divide-y divide-line">
            {(wrongCards ?? []).filter(Boolean).map((c) => (
              <div key={c!.id} className="px-4 py-3">
                <DeckPath deckId={c!.deckId} className="mb-0.5 !text-[11.5px]" />
                <p className="line-clamp-2 text-[14.5px]">{cardPreviewText(c!).front}</p>
              </div>
            ))}
          </Card>
        </motion.section>
      )}
    </div>
  )
}

function Tile({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <Card className="p-3.5 text-center">
      <Icon size={18} className="mx-auto mb-1.5 text-accent" />
      <p className="text-[18px] font-bold leading-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[12px] text-ink-2">{label}</p>
    </Card>
  )
}
