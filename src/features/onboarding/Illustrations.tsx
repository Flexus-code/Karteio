import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Check, Flame, X } from 'lucide-react'
import { ItemIcon } from '@/features/library/ItemIcon'

const loop = { repeat: Infinity, repeatDelay: 0.6 } as const

/** Willkommen: aufgefächerter Kartenstapel */
export function WelcomeIllustration() {
  return (
    <div className="relative h-44 w-56">
      {[-12, 0, 12].map((rotate, i) => (
        <motion.div
          key={rotate}
          className="absolute inset-x-4 inset-y-6 rounded-3xl border border-line bg-surface shadow-lift"
          style={{ zIndex: i === 1 ? 2 : 0 }}
          initial={{ rotate: 0, y: 30, opacity: 0 }}
          animate={{ rotate, y: i === 1 ? -6 : 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 + i * 0.1 }}
        >
          {i === 1 && (
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <span className="font-display text-[30px] font-extrabold tracking-tight text-accent">Karteio</span>
              <span className="text-[12px] text-ink-3">by Felix Böse</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/** Ordner & Stapel: verschachtelte Liste baut sich auf */
export function FoldersIllustration() {
  const rows = [
    { icon: '🎓', color: 'indigo', name: 'IHK Prüfung', depth: 0, variant: 'folder' },
    { icon: '🌐', color: 'cyan', name: 'Netzwerktechnik', depth: 1, variant: 'folder' },
    { icon: '🗂️', color: 'blue', name: 'OSI-Modell', depth: 2, variant: 'deck' },
    { icon: '💶', color: 'green', name: 'WiSo', depth: 1, variant: 'folder' },
  ] as const
  return (
    <div className="w-64 space-y-2">
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 shadow-soft"
          style={{ marginLeft: r.depth * 18 }}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.15 + i * 0.12 }}
        >
          <ItemIcon icon={r.icon} color={r.color} size={32} variant={r.variant} />
          <span className="text-[14px] font-semibold">{r.name}</span>
        </motion.div>
      ))}
    </div>
  )
}

/** Karten schreiben: Frage wird getippt, Karte dreht sich zur Antwort und zurück */
export function CreateIllustration() {
  const question = 'Was ist ein Router?'
  const [back, setBack] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setBack((b) => !b), 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative h-44 w-64" style={{ perspective: 900 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={back ? 'back' : 'front'}
          className="absolute inset-0 flex flex-col justify-center rounded-3xl border border-line bg-surface p-5 shadow-lift"
          initial={{ rotateY: -90 }}
          animate={{ rotateY: 0, transition: { duration: 0.28, ease: [0, 0, 0.3, 1] } }}
          exit={{ rotateY: 90, transition: { duration: 0.24, ease: [0.5, 0, 1, 1] } }}
        >
          <span className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{back ? 'Rückseite' : 'Vorderseite'}</span>
          {back ? (
            <p className="text-[15px] leading-snug">
              Verbindet <mark className="rounded bg-accent-soft px-1 text-accent">Netzwerke</mark> und leitet Pakete anhand der IP-Adresse weiter.
            </p>
          ) : (
            <p className="text-[18px] font-semibold">
              {question.split('').map((ch, i) => (
                <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.01 }}>
                  {ch}
                </motion.span>
              ))}
              <motion.span
                className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 bg-accent"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Lernen: Karte wird nach rechts (gewusst) bzw. links (nicht gewusst) gewischt */
export function LearnIllustration() {
  return (
    <div className="relative h-48 w-64">
      <div className="absolute inset-x-6 inset-y-4 translate-y-3 scale-95 rounded-3xl border border-line bg-surface opacity-60 shadow-soft" />
      <motion.div
        className="absolute inset-x-6 inset-y-4 flex items-center justify-center rounded-3xl border border-line bg-surface p-5 text-center shadow-lift"
        animate={{ x: [0, 0, 150, 150, 0, 0, -150, -150, 0], rotate: [0, 0, 14, 14, 0, 0, -14, -14, 0], opacity: [1, 1, 0, 0, 1, 1, 0, 0, 1] }}
        transition={{ duration: 5, times: [0, 0.12, 0.3, 0.32, 0.4, 0.55, 0.73, 0.75, 0.85], ...loop }}
      >
        <p className="text-[16px] font-semibold">Welche Schicht ist für das Routing zuständig?</p>
      </motion.div>
      <motion.div
        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-success text-white shadow-lift"
        animate={{ scale: [0.6, 0.6, 1.15, 0.6, 0.6], opacity: [0, 0, 1, 0, 0] }}
        transition={{ duration: 5, times: [0, 0.15, 0.27, 0.38, 1], ...loop }}
      >
        <Check size={22} strokeWidth={3} />
      </motion.div>
      <motion.div
        className="absolute left-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-danger text-white shadow-lift"
        animate={{ scale: [0.6, 0.6, 1.15, 0.6, 0.6], opacity: [0, 0, 1, 0, 0] }}
        transition={{ duration: 5, times: [0, 0.58, 0.7, 0.8, 1], ...loop }}
      >
        <X size={22} strokeWidth={3} />
      </motion.div>
    </div>
  )
}

/** Fortschritt: Ring füllt sich, Streak-Flamme, Countdown */
export function ProgressIllustration() {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-28">
        <svg viewBox="0 0 108 108" className="size-full -rotate-90">
          <circle cx="54" cy="54" r={r} fill="none" strokeWidth="11" className="stroke-surface-2" />
          <motion.circle
            cx="54"
            cy="54"
            r={r}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            stroke="var(--accent)"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * 0.22 }}
            transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-bold">78 %</span>
          <span className="text-[11px] text-ink-3">beherrscht</span>
        </div>
      </div>
      <div className="space-y-2">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-soft"
        >
          <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <Flame size={20} className="text-warning" />
          </motion.span>
          <span className="text-[14px] font-semibold">12 Tage Streak</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-line bg-surface px-3 py-2 shadow-soft"
        >
          <span className="text-[14px] font-semibold">🎯 Prüfung in 42 Tagen</span>
        </motion.div>
      </div>
    </div>
  )
}

/** Offline & sicher: Handy mit Schild */
export function OfflineIllustration() {
  return (
    <div className="relative flex h-44 w-56 items-center justify-center">
      <motion.div
        className="absolute size-40 rounded-full accent-gradient opacity-20 blur-2xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="relative flex h-40 w-28 flex-col items-center justify-center gap-2 rounded-[22px] px-2 text-center border-4 border-ink/80 bg-surface shadow-lift"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <motion.span
          className="text-[40px]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.35 }}
        >
          🔒
        </motion.span>
        <span className="text-[11px] font-semibold text-ink-2">Nur auf deinem Handy</span>
      </motion.div>
      <motion.span
        className="absolute right-2 top-6 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold shadow-soft"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        ✈️ Offline
      </motion.span>
      <motion.span
        className="absolute bottom-6 left-0 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold shadow-soft"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.75 }}
      >
        💾 Backup
      </motion.span>
    </div>
  )
}
