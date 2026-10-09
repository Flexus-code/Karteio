import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const APP_NAME = 'Karteio'
const DURATION_MS = 2300

/** Animierter Startbildschirm beim Öffnen der App. Antippen überspringt ihn. */
export function SplashScreen() {
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), reduced ? 900 : DURATION_MS)
    return () => clearTimeout(t)
  }, [reduced])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="presentation"
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden accent-gradient text-white"
          exit={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
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

          {/* Kartenfächer */}
          <div className="relative mb-10 h-32 w-44">
            {[-14, 0, 14].map((rotate, i) => (
              <motion.div
                key={rotate}
                className="absolute inset-0 rounded-[22px] border border-white/40 bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)]"
                style={{ opacity: i === 1 ? 1 : 0.55 }}
                initial={{ y: 60, rotate: 0, scale: 0.6, opacity: 0 }}
                animate={{ y: i === 1 ? 0 : 6, rotate, scale: 1, opacity: i === 1 ? 1 : 0.55 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 + i * 0.08 }}
              >
                {i === 1 && (
                  <div className="flex h-full flex-col justify-center gap-3 px-6">
                    <motion.div
                      className="h-3.5 rounded-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="h-2.5 rounded-full bg-accent-soft"
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ delay: 0.7, duration: 0.5, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="h-2.5 rounded-full bg-accent-soft"
                      initial={{ width: 0 }}
                      animate={{ width: '70%' }}
                      transition={{ delay: 0.82, duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Schriftzug */}
          <h1 aria-label={APP_NAME} className="flex font-display text-[46px] font-extrabold tracking-tight">
            {APP_NAME.split('').map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={{ opacity: 0, y: 24, rotateX: -80 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.45 + i * 0.05 }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="mt-1 text-[15px] font-medium text-white/80"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.4 }}
          >
            Lernen, das hängen bleibt.
          </motion.p>

          <motion.p
            className="absolute bottom-[calc(var(--safe-bottom)+36px)] text-[13px] tracking-wide text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            by <span className="font-semibold text-white">Felix Böse</span>
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
