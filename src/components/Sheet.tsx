import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Fußbereich, der beim Scrollen sichtbar bleibt (z. B. Speichern-Button) */
  footer?: ReactNode
}

/** Bottom-Sheet im iOS-Stil. Zum Schließen nach unten ziehen oder außerhalb tippen. */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const controls = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute bottom-0 flex max-h-[92%] w-full max-w-[480px] flex-col rounded-t-[28px] bg-elevated shadow-lift"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            onDragEnd={onDragEnd}
          >
            <div className="shrink-0 cursor-grab touch-none px-5 pb-2 pt-2.5" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-2" />
              {title && <h2 className="text-center text-[17px] font-semibold">{title}</h2>}
            </div>
            <div className="scroll-area min-h-0 flex-1 px-5 pb-4">{children}</div>
            {footer && <div className="shrink-0 border-t border-line px-5 pb-[calc(var(--safe-bottom)+16px)] pt-3">{footer}</div>}
            {!footer && <div className="shrink-0 pb-[calc(var(--safe-bottom)+8px)]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
