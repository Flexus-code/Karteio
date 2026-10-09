import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Sheet } from './Sheet'

export interface ActionItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  header?: ReactNode
  actions: ActionItem[]
}

/** Kontextmenü als Bottom-Sheet. */
export function ActionSheet({ open, onClose, header, actions }: ActionSheetProps) {
  return (
    <Sheet open={open} onClose={onClose}>
      {header && <div className="mb-3">{header}</div>}
      <ul className="overflow-hidden rounded-2xl bg-surface-2/60">
        {actions.map((a, i) => (
          <motion.li
            key={a.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i }}
            className="border-b border-line last:border-b-0"
          >
            <button
              disabled={a.disabled}
              onClick={() => {
                onClose()
                a.onSelect()
              }}
              className={`flex min-h-13 w-full items-center gap-3.5 px-4 text-left text-[16px] active:bg-surface-2 disabled:opacity-40 ${a.danger ? 'text-danger' : 'text-ink'}`}
            >
              <a.icon size={20} className={a.danger ? 'text-danger' : 'text-accent'} />
              {a.label}
            </button>
          </motion.li>
        ))}
      </ul>
    </Sheet>
  )
}
