import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const APP_NAME = 'Karteio'

/**
 * Ablauf: Karte mit „Karteio“ erscheint → Karte dreht sich um → Karte wird wie beim Lernen
 * weggewischt und nimmt den Startbildschirm mit.
 */
type Phase = 'enter' | 'flipOut' | 'flipIn' | 'swipe' | 'done'

// Umdrehen in zwei Hälften (bis zur Kante, Inhalt tauschen, zurück) – zuverlässiger als backface-visibility
const TIMELINE: [Phase, number][] = [
  ['flipOut', 1500],
  ['flipIn', 1760],
  ['swipe', 2600],
  ['done', 3150],
]

interface SplashScreenProps {
  onFinished?: () => void
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => setPhase('done'), 900)
      return () => clearTimeout(t)
    }
    const timers = TIMELINE.map(([p, ms]) => setTimeout(() => setPhase(p), ms))
    return () => timers.forEach(clearTimeout)
  }, [reduced])

  useEffect(() => {
    if (phase === 'done') onFinished?.()
  }, [phase, onFinished])

  const showBack = phase === 'flipIn' || phase === 'swipe'
  const swiping = phase === 'swipe'

  const cardAnimate = swiping
    ? { opacity: 0, x: 520, y: -60, rotate: 28, scale: 1, rotateY: 0 }
    : phase === 'flipOut'
      ? { opacity: 1, x: 0, y: 0, scale: 1.04, rotate: 0, rotateY: 90 }
      : phase === 'flipIn'
        ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, rotateY: [-90, 0] }
        : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, rotateY: 0 }

  const cardTransition = swiping
    ? { duration: 0.55, ease: [0.5, 0, 0.75, 0] as const }
    : phase === 'flipOut'
      ? { duration: 0.25, ease: [0.5, 0, 1, 1] as const }
      : phase === 'flipIn'
        ? { duration: 0.3, ease: [0, 0, 0.3, 1] as const }
        : { type: 'spring' as const, stiffness: 160, damping: 18 }

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="splash"
          role="presentation"
          onClick={() => setPhase('done')}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden accent-gradient text-white"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Hintergrund-Glows */}
          <motion.div
            className="absolute -left-24 -top-24 size-80 rounded-full bg-white/15 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-32 -right-20 size-96 rounded-full bg-black/10 blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative h-[200px] w-[290px]" style={{ perspective: 1000 }}>
            {/* Stapel dahinter */}
            {[2, 1].map((depth) => (
              <motion.div
                key={depth}
                className="absolute inset-0 rounded-[28px] bg-white"
                initial={{ opacity: 0, y: 40, scale: 0.8 }}
                animate={
                  swiping
                    ? { opacity: 0, y: depth * 14, scale: 1 - depth * 0.05, rotate: depth * 3 }
                    : { opacity: 0.18 * (3 - depth), y: depth * 14, scale: 1 - depth * 0.05, rotate: depth * 3 }
                }
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: swiping ? 0.15 : 0.1 * depth }}
              />
            ))}

            {/* Hauptkarte */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] bg-white px-8 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]"
              initial={{ opacity: 0, y: 80, scale: 0.7, rotate: -6 }}
              animate={cardAnimate}
              transition={cardTransition}
            >
              {showBack ? (
                <>
                  <span className="mb-2 text-[44px] leading-none">🧠</span>
                  <p className="text-[19px] font-bold text-[#1c1c28]">Lernen, das hängen bleibt.</p>
                </>
              ) : (
                <>
                  <h1 aria-label={APP_NAME} className="flex font-display text-[50px] font-extrabold tracking-tight text-accent">
                    {APP_NAME.split('').map((ch, i) => (
                      <motion.span
                        key={i}
                        aria-hidden
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.35 + i * 0.06 }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </h1>
                  <motion.div
                    className="mt-2 h-1.5 rounded-full accent-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: 90 }}
                    transition={{ delay: 0.85, duration: 0.45, ease: 'easeOut' }}
                  />
                </>
              )}
            </motion.div>
          </div>

          <motion.p
            className="absolute bottom-[calc(var(--safe-bottom)+36px)] text-[13px] tracking-wide text-white/75"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            by <span className="font-semibold text-white">Felix Böse</span>
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
