import { Check } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import type { Id } from '@/db/types'
import { ItemIcon } from './ItemIcon'
import type { Library } from './tree'

interface DeckPickerSheetProps {
  open: boolean
  onClose: () => void
  library: Library
  title: string
  currentDeckId?: Id
  onPick: (deckId: Id) => void
}

/** Auswahl eines Stapels (z. B. zum Verschieben von Karten), gruppiert nach Ordnerpfad. */
export function DeckPickerSheet({ open, onClose, library, title, currentDeckId, onPick }: DeckPickerSheetProps) {
  const decks = [...library.decks.values()]
    .map((d) => ({ deck: d, path: library.path(d.folderId).map((f) => f.name).join(' › ') }))
    .sort((a, b) => a.path.localeCompare(b.path, 'de') || a.deck.order - b.deck.order)

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {decks.length === 0 || (currentDeckId && decks.length <= 1) ? (
        <p className="py-8 text-center text-[14px] text-ink-2">Lege zuerst einen weiteren Stapel an.</p>
      ) : (
        <ul className="space-y-1 pt-1">
          {decks.map(({ deck, path }) => {
            const current = deck.id === currentDeckId
            return (
              <li key={deck.id}>
                <button
                  disabled={current}
                  onClick={() => {
                    onClose()
                    onPick(deck.id)
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left active:bg-surface-2 disabled:opacity-50"
                >
                  <ItemIcon icon={deck.icon} color={deck.color} size={38} variant="deck" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{deck.name}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">{path || 'Oberste Ebene'}</span>
                  </span>
                  {current && <Check size={18} className="text-accent" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
