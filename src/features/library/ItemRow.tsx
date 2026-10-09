import { motion, type DragControls } from 'framer-motion'
import { ChevronRight, GripVertical, MoreHorizontal } from 'lucide-react'
import type { ItemColor } from '@/db/types'
import { useLongPress } from '@/lib/useLongPress'
import { ItemIcon } from './ItemIcon'
import type { ItemStats } from './tree'

interface ItemRowProps {
  kind: 'folder' | 'deck'
  id: string
  name: string
  icon: string
  color: ItemColor
  subtitle: string
  stats: ItemStats
  sorting?: boolean
  dragControls?: DragControls
  onOpen: () => void
  onMenu: () => void
}

export function ItemRow({ kind, id, name, icon, color, subtitle, stats, sorting, dragControls, onOpen, onMenu }: ItemRowProps) {
  const { handlers, wasLongPress } = useLongPress(onMenu)
  const percent = Math.round(stats.progress * 100)

  return (
    <motion.div
      whileTap={sorting ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      className="relative flex items-center gap-3.5 rounded-[22px] border border-line bg-surface p-3 pr-2 shadow-soft"
    >
      <button
        type="button"
        disabled={sorting}
        {...(sorting ? {} : handlers)}
        onClick={() => !wasLongPress() && onOpen()}
        className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
        aria-label={`${kind === 'folder' ? 'Ordner' : 'Stapel'} ${name} öffnen`}
      >
        <ItemIcon icon={icon} color={color} variant={kind} layoutId={sorting ? undefined : `icon-${id}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[16px] font-semibold tracking-tight">{name}</p>
            {stats.due > 0 && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11.5px] font-bold text-white">{stats.due}</span>
            )}
          </div>
          <p className="truncate text-[13px] text-ink-2">{subtitle}</p>
          {stats.total > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full accent-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                />
              </div>
              <span className="w-8 text-right text-[11.5px] font-medium tabular-nums text-ink-3">{percent}%</span>
            </div>
          )}
        </div>
      </button>

      {sorting ? (
        <div
          className="flex size-11 touch-none items-center justify-center text-ink-3 active:cursor-grabbing"
          onPointerDown={(e) => dragControls?.start(e)}
          aria-label="Ziehen zum Sortieren"
        >
          <GripVertical size={20} />
        </div>
      ) : (
        <div className="flex items-center">
          <button
            type="button"
            onClick={onMenu}
            aria-label={`Aktionen für ${name}`}
            className="flex size-10 items-center justify-center rounded-full text-ink-3 active:bg-surface-2"
          >
            <MoreHorizontal size={20} />
          </button>
          <ChevronRight size={18} className="-ml-1 text-ink-3" />
        </div>
      )}
    </motion.div>
  )
}
