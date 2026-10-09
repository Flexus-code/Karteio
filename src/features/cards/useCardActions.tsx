import { Copy, Flag, FolderInput, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionSheet } from '@/components/ActionSheet'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import type { Card, Id } from '@/db/types'
import { DeckPickerSheet } from '@/features/library/DeckPickerSheet'
import type { Library } from '@/features/library/tree'
import { toast } from '@/store/toast'
import { cardPreviewText } from './CardRow'
import * as repo from './repo'
import { TagInput } from './TagInput'

const n = (count: number) => (count === 1 ? '1 Karte' : `${count} Karten`)

/** Kontextmenü und Sammelaktionen für Karten. */
export function useCardActions(library: Library | undefined, deckId: Id, onDone?: () => void) {
  const navigate = useNavigate()
  const [menuCard, setMenuCard] = useState<Card | null>(null)
  const [moveIds, setMoveIds] = useState<Id[] | null>(null)
  const [tagIds, setTagIds] = useState<Id[] | null>(null)
  const [newTags, setNewTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const trash = async (ids: Id[]) => {
    await repo.trashCards(ids)
    onDone?.()
    toast(`${n(ids.length)} in den Papierkorb verschoben`, {
      action: { label: 'Rückgängig', run: () => repo.restoreCards(ids) },
    })
  }

  const flag = async (ids: Id[], flagged: boolean) => {
    await repo.setFlagged(ids, flagged)
    onDone?.()
    toast(flagged ? `${n(ids.length)} markiert` : 'Markierung entfernt', { tone: 'success' })
  }

  const openTags = (ids: Id[]) => {
    setNewTags([])
    void repo.allTags().then(setSuggestions)
    setTagIds(ids)
  }

  const dialogs: ReactNode = (
    <>
      <ActionSheet
        open={menuCard !== null}
        onClose={() => setMenuCard(null)}
        header={menuCard && <p className="line-clamp-2 px-1 text-center text-[14px] font-medium text-ink-2">{cardPreviewText(menuCard).front}</p>}
        actions={
          menuCard
            ? [
                { label: 'Bearbeiten', icon: Pencil, onSelect: () => navigate(`/karte/${menuCard.id}/bearbeiten`) },
                {
                  label: 'Duplizieren',
                  icon: Copy,
                  onSelect: () => void repo.duplicateCard(menuCard.id).then(() => toast('Karte dupliziert', { tone: 'success' })),
                },
                { label: menuCard.flagged ? 'Markierung entfernen' : 'Markieren', icon: Flag, onSelect: () => void flag([menuCard.id], !menuCard.flagged) },
                {
                  label: menuCard.suspended ? 'Wieder lernen' : 'Aussetzen (nicht abfragen)',
                  icon: menuCard.suspended ? Play : Pause,
                  onSelect: () => void repo.setSuspended([menuCard.id], !menuCard.suspended),
                },
                { label: 'In anderen Stapel verschieben', icon: FolderInput, onSelect: () => setMoveIds([menuCard.id]) },
                { label: 'In den Papierkorb', icon: Trash2, danger: true, onSelect: () => void trash([menuCard.id]) },
              ]
            : []
        }
      />
      {library && (
        <DeckPickerSheet
          open={moveIds !== null}
          onClose={() => setMoveIds(null)}
          library={library}
          title={moveIds ? `${n(moveIds.length)} verschieben` : ''}
          currentDeckId={deckId}
          onPick={async (target) => {
            if (!moveIds) return
            await repo.moveCards(moveIds, target)
            onDone?.()
            toast(`${n(moveIds.length)} nach „${library.decks.get(target)?.name}“ verschoben`, {
              tone: 'success',
              action: { label: 'Rückgängig', run: () => repo.moveCards(moveIds, deckId) },
            })
          }}
        />
      )}
      <Sheet
        open={tagIds !== null}
        onClose={() => setTagIds(null)}
        title={tagIds ? `Schlagwörter für ${n(tagIds.length)}` : ''}
        footer={
          <Button
            block
            disabled={newTags.length === 0}
            onClick={async () => {
              if (!tagIds) return
              await repo.addTags(tagIds, newTags)
              setTagIds(null)
              onDone?.()
              toast('Schlagwörter hinzugefügt', { tone: 'success' })
            }}
          >
            Hinzufügen
          </Button>
        }
      >
        <div className="pt-2">
          <TagInput tags={newTags} onChange={setNewTags} suggestions={suggestions} />
        </div>
      </Sheet>
    </>
  )

  return { dialogs, openMenu: setMenuCard, move: setMoveIds, trash, flag, openTags }
}
