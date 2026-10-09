import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionSheet } from '@/components/ActionSheet'
import { EmptyState } from '@/components/EmptyState'
import { db } from '@/db/db'
import { cardPreviewText } from '@/features/cards/CardRow'
import { deleteCardsForever, restoreCards } from '@/features/cards/repo'
import { ItemIcon } from '@/features/library/ItemIcon'
import { deleteDeckForever, deleteFolderForever, restoreDeck, restoreFolder, TRASH_RETENTION_MS } from '@/features/library/repo'
import { toast } from '@/store/toast'

interface TrashEntry {
  kind: 'folder' | 'deck' | 'card'
  id: string
  title: string
  subtitle: string
  deletedAt: number
  icon?: { icon: string; color: Parameters<typeof ItemIcon>[0]['color'] }
}

function daysLeft(deletedAt: number) {
  return Math.max(0, Math.ceil((deletedAt + TRASH_RETENTION_MS - Date.now()) / 86_400_000))
}

export function TrashPage() {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<TrashEntry | 'all' | null>(null)

  const entries = useLiveQuery(async (): Promise<TrashEntry[]> => {
    const [folders, decks, cards, allDecks] = await Promise.all([
      db.folders.where('deletedAt').above(0).toArray(),
      db.decks.where('deletedAt').above(0).toArray(),
      db.cards.where('deletedAt').above(0).toArray(),
      db.decks.toArray(),
    ])
    const deckName = new Map(allDecks.map((d) => [d.id, d.name]))
    return [
      ...folders.map((f) => ({ kind: 'folder' as const, id: f.id, title: f.name, subtitle: 'Ordner mit Inhalt', deletedAt: f.deletedAt!, icon: { icon: f.icon, color: f.color } })),
      ...decks.map((d) => ({ kind: 'deck' as const, id: d.id, title: d.name, subtitle: 'Stapel mit Karten', deletedAt: d.deletedAt!, icon: { icon: d.icon, color: d.color } })),
      ...cards.map((c) => ({ kind: 'card' as const, id: c.id, title: cardPreviewText(c).front || '(leer)', subtitle: `Karte aus „${deckName.get(c.deckId) ?? '?'}“`, deletedAt: c.deletedAt! })),
    ].sort((a, b) => b.deletedAt - a.deletedAt)
  })

  const restore = async (e: TrashEntry) => {
    if (e.kind === 'folder') await restoreFolder(e.id)
    else if (e.kind === 'deck') await restoreDeck(e.id)
    else await restoreCards([e.id])
    toast(`„${e.title.slice(0, 40)}“ wiederhergestellt`, { tone: 'success' })
  }

  const destroy = async (e: TrashEntry) => {
    if (e.kind === 'folder') await deleteFolderForever(e.id)
    else if (e.kind === 'deck') await deleteDeckForever(e.id)
    else await deleteCardsForever([e.id])
  }

  const emptyAll = async () => {
    for (const e of entries ?? []) await destroy(e)
    toast('Papierkorb geleert', { tone: 'success' })
  }

  return (
    <>
      <header className="px-5 pb-4 pt-2">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="-ml-2 flex min-h-11 items-center gap-0.5 pr-2 text-[16px] font-medium text-accent">
            <ChevronLeft size={24} /> Zurück
          </button>
          {entries && entries.length > 0 && (
            <button onClick={() => setConfirm('all')} className="min-h-11 px-1 text-[15px] font-medium text-danger">
              Leeren
            </button>
          )}
        </div>
        <h1 className="font-display text-[32px] font-bold tracking-tight">Papierkorb</h1>
        <p className="text-[13.5px] text-ink-2">Gelöschtes wird nach 30 Tagen endgültig entfernt.</p>
      </header>

      {entries && entries.length === 0 ? (
        <EmptyState icon={Trash2} title="Papierkorb ist leer" text="Gelöschte Ordner, Stapel und Karten landen hier und können 30 Tage lang wiederhergestellt werden." />
      ) : (
        <ul className="space-y-2.5 px-5 pb-6">
          <AnimatePresence initial={false}>
            {(entries ?? []).map((e) => (
              <motion.li
                key={`${e.kind}-${e.id}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-3 shadow-soft"
              >
                {e.icon ? (
                  <ItemIcon icon={e.icon.icon} color={e.icon.color} size={40} variant={e.kind === 'deck' ? 'deck' : 'folder'} />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-[18px]">🃏</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{e.title}</p>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {e.subtitle} · noch {daysLeft(e.deletedAt)} {daysLeft(e.deletedAt) === 1 ? 'Tag' : 'Tage'}
                  </p>
                </div>
                <button onClick={() => void restore(e)} aria-label="Wiederherstellen" className="flex size-10 items-center justify-center rounded-full text-accent active:bg-surface-2">
                  <RotateCcw size={19} />
                </button>
                <button onClick={() => setConfirm(e)} aria-label="Endgültig löschen" className="flex size-10 items-center justify-center rounded-full text-danger active:bg-surface-2">
                  <X size={20} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ActionSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        header={
          <p className="px-1 text-center text-[14px] text-ink-2">
            {confirm === 'all' ? 'Alles im Papierkorb wird endgültig gelöscht.' : 'Wird endgültig gelöscht.'} Das kann nicht rückgängig gemacht werden.
          </p>
        }
        actions={[
          {
            label: confirm === 'all' ? 'Papierkorb leeren' : 'Endgültig löschen',
            icon: Trash2,
            danger: true,
            onSelect: () => void (confirm === 'all' ? emptyAll() : confirm && destroy(confirm).then(() => toast('Endgültig gelöscht'))),
          },
        ]}
      />
    </>
  )
}
