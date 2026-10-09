import { motion } from 'framer-motion'
import type { ItemColor } from '@/db/types'
import { colorGradient } from '@/lib/colors'

interface ItemIconProps {
  icon: string
  color: ItemColor
  size?: number
  layoutId?: string
  /** Stapel bekommen eine Karten-Optik mit versetzter Rückseite */
  variant?: 'folder' | 'deck'
}

export function ItemIcon({ icon, color, size = 48, layoutId, variant = 'folder' }: ItemIconProps) {
  const radius = Math.round(size * 0.3)
  return (
    <motion.div layoutId={layoutId} className="relative shrink-0" style={{ width: size, height: size }}>
      {variant === 'deck' && (
        <div
          className="absolute inset-0 translate-x-[3px] -translate-y-[3px] rotate-6 opacity-40"
          style={{ background: colorGradient(color), borderRadius: radius }}
        />
      )}
      <div
        className="relative flex size-full items-center justify-center shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_16px_-8px_rgb(0_0_0/0.45)]"
        style={{ background: colorGradient(color), borderRadius: radius }}
      >
        <span aria-hidden style={{ fontSize: size * 0.5, lineHeight: 1 }}>
          {icon}
        </span>
      </div>
    </motion.div>
  )
}
