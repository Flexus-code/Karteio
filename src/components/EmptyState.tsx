import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  text: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 26 }}
      className="flex flex-col items-center px-8 py-14 text-center"
    >
      <div className="relative mb-6">
        <motion.div
          className="absolute inset-0 rounded-[28px] accent-gradient opacity-25 blur-2xl"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative flex size-20 items-center justify-center rounded-[28px] accent-gradient text-white shadow-lift"
          animate={{ y: [0, -6, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={36} strokeWidth={1.8} />
        </motion.div>
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mb-6 max-w-[280px] text-[15px] leading-relaxed text-ink-2">{text}</p>
      {action}
    </motion.div>
  )
}
