import { Check, CornerDownRight, Home } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import type { Folder, Id } from '@/db/types'
import { ItemIcon } from './ItemIcon'
import type { Library } from './tree'

interface MoveSheetProps {
  open: boolean
  onClose: () => void
  library: Library
  /** Name des zu verschiebenden Elements */
  itemName: string
  currentParentId: Id | null
  /** Bei Ordnern: ID, damit er nicht in sich selbst verschoben werden kann */
  movingFolderId?: Id
  onMove: (targetId: Id | null) => void
}

export function MoveSheet({ open, onClose, library, itemName, currentParentId, movingFolderId, onMove }: MoveSheetProps) {
  const rows: { folder: Folder; depth: number }[] = []
  const walk = (parentId: Id | null, depth: number) => {
    for (const f of library.foldersIn(parentId)) {
      rows.push({ folder: f, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)

  const choose = (id: Id | null) => {
    onClose()
    if (id !== currentParentId) onMove(id)
  }

  const isBlocked = (id: Id) => (movingFolderId ? !library.canMoveFolder(movingFolderId, id) : false)

  return (
    <Sheet open={open} onClose={onClose} title={`„${itemName}“ verschieben`}>
      <ul className="space-y-1 pt-1">
        <li>
          <button
            onClick={() => choose(null)}
            className="flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left active:bg-surface-2"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
              <Home size={18} />
            </div>
            <span className="flex-1 font-medium">Oberste Ebene</span>
            {currentParentId === null && <Check size={18} className="text-accent" />}
          </button>
        </li>
        {rows.map(({ folder, depth }) => {
          const blocked = isBlocked(folder.id)
          return (
            <li key={folder.id}>
              <button
                disabled={blocked}
                onClick={() => choose(folder.id)}
                className="flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 text-left active:bg-surface-2 disabled:opacity-35"
                style={{ paddingLeft: 12 + depth * 22 }}
              >
                {depth > 0 && <CornerDownRight size={14} className="-mr-1 text-ink-3" />}
                <ItemIcon icon={folder.icon} color={folder.color} size={36} />
                <span className="flex-1 truncate font-medium">{folder.name}</span>
                {currentParentId === folder.id && <Check size={18} className="text-accent" />}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
