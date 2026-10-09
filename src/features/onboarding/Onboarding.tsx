import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import {
  CreateIllustration,
  FoldersIllustration,
  LearnIllustration,
  OfflineIllustration,
  ProgressIllustration,
  WelcomeIllustration,
} from './Illustrations'

interface Slide {
  title: string
  text: string
  tips: string[]
  illustration: ReactNode
}

const SLIDES: Slide[] = [
  {
    title: 'Willkommen bei Karteio',
    text: 'Deine Karteikarten – selbst geschrieben, clever wiederholt und immer dabei.',
    tips: ['Wische oder tippe auf „Weiter“, um die wichtigsten Funktionen kennenzulernen.'],
    illustration: <WelcomeIllustration />,
  },
  {
    title: 'Ordner & Stapel',
    text: 'Sortiere deine Karten in Ordnern – so tief verschachtelt, wie du willst. Ein Stapel ist ein Thema mit Karten.',
    tips: ['Tippe auf das ＋ oben rechts, um etwas anzulegen.', 'Lange drücken öffnet das Menü: bearbeiten, verschieben, löschen.', '„Sortieren“ ändert die Reihenfolge per Ziehen.'],
    illustration: <FoldersIllustration />,
  },
  {
    title: 'Karten schreiben',
    text: 'Vorderseite für die Frage, Rückseite für die Antwort – mit Formatierung und Bildern.',
    tips: ['Kartentypen: Standard, umkehrbar, Lückentext, Multiple Choice und Eingabe.', 'Nach dem Speichern geht es direkt mit der nächsten Karte weiter.'],
    illustration: <CreateIllustration />,
  },
  {
    title: 'Lernen mit Wischen',
    text: 'Tippe die Karte an, um sie umzudrehen. Dann wischen: rechts = gewusst, links = nochmal.',
    tips: ['Karteio plant automatisch, wann du eine Karte wiederholen solltest (Spaced Repetition).', 'Weitere Modi: Schreiben, Quiz und Prüfungssimulation mit Timer.'],
    illustration: <LearnIllustration />,
  },
  {
    title: 'Fortschritt & Prüfung',
    text: 'Behalte im Blick, was du schon kannst – und wie viel bis zur Prüfung noch fehlt.',
    tips: ['Lege in den Einstellungen dein Prüfungsdatum fest.', 'Halte deine Streak: jeden Tag ein paar Karten.'],
    illustration: <ProgressIllustration />,
  },
  {
    title: 'Offline & privat',
    text: 'Alles bleibt auf deinem Handy und funktioniert auch ohne Internet.',
    tips: ['Erstelle regelmäßig ein Backup, damit nichts verloren geht.', 'Optional hilft dir Claude (KI) beim Erstellen von Karten.'],
    illustration: <OfflineIllustration />,
  },
]

interface OnboardingProps {
  onDone: () => void
  /** Startet mit Beispiel-Stapel */
  onSample?: () => void
}

export function Onboarding({ onDone, onSample }: OnboardingProps) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0])
  const last = index === SLIDES.length - 1
  const slide = SLIDES[index]!

  const go = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return
    setPage([next, next > index ? 1 : -1])
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2
    if (swipe < -80) go(index + 1)
    else if (swipe > 80) go(index - 1)
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Kurzanleitung"
      className="fixed inset-0 z-[90] flex justify-center bg-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex h-full w-full max-w-[480px] flex-col pb-[calc(var(--safe-bottom)+20px)] pt-[calc(var(--safe-top)+8px)]">
        <div className="flex h-12 items-center justify-between px-5">
          <span className="text-[13px] font-medium tabular-nums text-ink-3">
            {index + 1} / {SLIDES.length}
          </span>
          {!last && (
            <button onClick={onDone} className="min-h-11 px-2 text-[15px] font-medium text-ink-2">
              Überspringen
            </button>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={index}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d >= 0 ? 320 : -320, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d >= 0 ? -320 : 320, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={onDragEnd}
              className="scroll-area absolute inset-0 flex touch-pan-y flex-col items-center px-7"
            >
              <div className="flex min-h-[230px] flex-1 items-center justify-center py-4">{slide.illustration}</div>
              <div className="w-full pb-4">
                <h2 className="mb-2 text-center font-display text-[27px] font-bold leading-tight tracking-tight">{slide.title}</h2>
                <p className="mb-5 text-center text-[16px] leading-relaxed text-ink-2">{slide.text}</p>
                <ul className="space-y-2">
                  {slide.tips.map((tip, i) => (
                    <motion.li
                      key={tip}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="flex gap-2.5 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[14px] leading-snug"
                    >
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                      {tip}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-5 px-7 pt-3">
          <div className="flex justify-center gap-2" role="tablist" aria-label="Seiten">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={i === index}
                aria-label={`Seite ${i + 1}: ${s.title}`}
                onClick={() => go(i)}
                className="flex h-6 items-center"
              >
                <motion.span
                  className={`block h-2 rounded-full transition-colors ${i === index ? 'bg-accent' : 'bg-ink-3/30'}`}
                  animate={{ width: i === index ? 24 : 8 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              </button>
            ))}
          </div>
          <Button block onClick={() => (last ? onDone() : go(index + 1))}>
            {last ? "Los geht's" : 'Weiter'} <ArrowRight size={18} />
          </Button>
          {last && onSample && (
            <Button block variant="ghost" className="-mt-2" onClick={onSample}>
              Mit Beispiel-Stapel starten
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
