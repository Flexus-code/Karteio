import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface FlipCardProps {
  flipped: boolean
  onFlip?: () => void
  front: ReactNode
  back: ReactNode
  className?: string
}

/**
 * Karteikarte, die sich per 3D-Drehung umdreht.
 * Gedreht wird in zwei Hälften (bis zur Kante, Inhalt tauschen, zurück) – das funktioniert
 * zuverlässiger als `backface-visibility`, besonders bei Inhalten mit eigenen Ebenen.
 */
export function FlipCard({ flipped, onFlip, front, back, className = '' }: FlipCardProps) {
  return (
    <div className={`relative ${className}`} style={{ perspective: 1400 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={flipped ? 'back' : 'front'}
          role={onFlip ? 'button' : undefined}
          tabIndex={onFlip ? 0 : undefined}
          aria-label={onFlip ? (flipped ? 'Karte umdrehen: Frage zeigen' : 'Karte umdrehen: Antwort zeigen') : undefined}
          onClick={onFlip}
          onKeyDown={(e) => onFlip && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onFlip())}
          initial={{ rotateY: -90 }}
          animate={{ rotateY: 0, transition: { duration: 0.2, ease: [0, 0, 0.3, 1] } }}
          exit={{ rotateY: 90, transition: { duration: 0.16, ease: [0.5, 0, 1, 1] } }}
          className={`min-h-[260px] w-full rounded-[28px] border border-line bg-surface p-6 shadow-lift ${onFlip ? 'cursor-pointer' : ''}`}
        >
          {flipped ? back : front}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
