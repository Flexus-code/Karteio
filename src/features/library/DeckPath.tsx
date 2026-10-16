import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, FolderOpen } from 'lucide-react'
import { db } from '@/db/db'
import type { Id } from '@/db/types'

/** Pfad eines Stapels: Namen der übergeordneten Ordner (von oben) und der Stapelname */
export function useDeckPath(deckId: Id | undefined) {
  return useLiveQuery(async () => {
    if (!deckId) return undefined
    const deck = await db.decks.get(deckId)
    if (!deck) return undefined
    const folders: string[] = []
    let parentId = deck.folderId
    const seen = new Set<string>()
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId)
      const f = await db.folders.get(parentId)
      if (!f) break
      folders.unshift(f.name)
      parentId = f.parentId
    }
    return { folders, deck: deck.name }
  }, [deckId])
}

interface DeckPathProps {
  deckId: Id | undefined
  className?: string
}

/** Zeigt, woher eine Karte stammt: Ordner › Unterordner › Stapel */
export function DeckPath({ deckId, className = '' }: DeckPathProps) {
  const path = useDeckPath(deckId)
  if (!path) return null
  const parts = [...path.folders, path.deck]
  return (
    <p className={`flex min-w-0 items-center gap-1 text-[12.5px] text-ink-2 ${className}`} aria-label={`Aus: ${parts.join(' › ')}`}>
      <FolderOpen size={13} className="shrink-0 text-accent" />
      <span className="flex min-w-0 items-center gap-0.5 overflow-hidden">
        {parts.map((name, i) => {
          const last = i === parts.length - 1
          return (
            <span key={i} className={`flex items-center gap-0.5 ${last ? 'min-w-0' : 'shrink-[2] min-w-[2.5rem]'}`}>
              <span className={`truncate ${last ? 'font-semibold text-ink' : ''}`}>{name}</span>
              {!last && <ChevronRight size={12} className="shrink-0 text-ink-3" />}
            </span>
          )
        })}
      </span>
    </p>
  )
}
