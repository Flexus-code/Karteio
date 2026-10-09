import { AnimatePresence, motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Flag, FolderInput, Mic, MoreHorizontal, PenLine, Plus, Search, Tag, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Pressable } from '@/components/Pressable'
import { db } from '@/db/db'
import { cardPreviewText, CardRow } from '@/features/cards/CardRow'
import { useCardActions } from '@/features/cards/useCardActions'
import { ItemIcon } from '@/features/library/ItemIcon'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { useItemDialogs } from '@/features/library/useItemDialogs'
import { StudyButton } from '@/features/library/LibraryView'
import { useLibrary } from '@/features/library/useLibrary'

export function DeckPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const library = useLibrary()
  const deck = library?.decks.get(deckId)
  const backTo = deck?.folderId ? `/ordner/${deck.folderId}` : '/ordner'

  const cards = useLiveQuery(
    () =>
      db.cards
        .where('deckId')
        .equals(deckId)
        .filter((c) => !c.deletedAt)
        .sortBy('createdAt'),
    [deckId],
  )

  const [query, setQuery] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const endSelection = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const dialogs = useItemDialogs(library, { onTrashed: () => navigate(backTo, { replace: true }) })
  const cardActions = useCardActions(library, deckId, endSelection)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!cards || !q) return cards ?? []
    return cards.filter((c) => {
      const { front, back } = cardPreviewText(c)
      return `${front} ${back} ${c.tags.join(' ')} ${c.notes ?? ''}`.toLowerCase().includes(q)
    })
  }, [cards, query])

  if (!library || !cards) return <LibrarySkeleton />
  if (!deck) return <Navigate to="/ordner" replace />

  const stats = library.statsForDeck(deck.id)
  const backLabel = deck.folderId ? (library.folders.get(deck.folderId)?.name ?? 'Ordner') : 'Ordner'
  const ids = [...selected]
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allFlagged = ids.length > 0 && ids.every((id) => cards.find((c) => c.id === id)?.flagged)
  const newCard = () => navigate(`/stapel/${deck.id}/neu`)

  return (
    <>
      <header className="px-5 pb-4 pt-2">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate(backTo)} className="-ml-2 flex min-h-11 min-w-0 items-center gap-0.5 pr-2 text-[16px] font-medium text-accent">
            <ChevronLeft size={24} className="shrink-0" />
            <span className="truncate">{backLabel}</span>
          </button>
          <button
            onClick={() => dialogs.openMenu({ kind: 'deck', item: deck })}
            aria-label="Stapel-Aktionen"
            className="flex size-11 items-center justify-center rounded-full text-accent"
          >
            <MoreHorizontal size={22} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <ItemIcon icon={deck.icon} color={deck.color} size={64} variant="deck" layoutId={`icon-${deck.id}`} />
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">{deck.name}</h1>
            {deck.description && <p className="text-[14px] text-ink-2">{deck.description}</p>}
          </div>
        </div>
        {cards.length > 0 && <StudyButton scope={{ kind: 'deck', id: deck.id }} due={stats.due + stats.newCount} label="Stapel lernen" />}
      </header>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-5 grid grid-cols-3 gap-3 px-5">
        <Stat label={cards.length === 1 ? 'Karte' : 'Karten'} value={cards.length} />
        <Stat label="Fällig" value={stats.due} highlight={stats.due > 0} />
        <Stat label="Beherrscht" value={`${Math.round(stats.progress * 100)} %`} />
      </motion.div>

      {cards.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="Noch keine Karten"
          text="Schreib deine erste Karteikarte – Vorderseite mit der Frage, Rückseite mit der Antwort."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={newCard}>
                <Plus size={18} /> Karte hinzufügen
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/stapel/${deck.id}/sprache`)}>
                <Mic size={18} /> Per Sprache erstellen
              </Button>
            </div>
          }
        />
      ) : (
        <div className="px-5">
          <div className="sticky top-0 z-10 -mx-5 mb-3 flex items-center gap-2 bg-bg/90 px-5 py-2 backdrop-blur-md">
            {selecting ? (
              <>
                <p className="flex-1 text-[15px] font-semibold">{selected.size} ausgewählt</p>
                <button
                  onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)))}
                  className="min-h-10 px-2 text-[15px] font-medium text-accent"
                >
                  {selected.size === filtered.length ? 'Keine' : 'Alle'}
                </button>
                <button onClick={endSelection} className="min-h-10 px-2 text-[15px] font-semibold text-accent">
                  Fertig
                </button>
              </>
            ) : (
              <>
                <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-transparent bg-surface-2 px-3 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
                  <Search size={16} className="shrink-0 text-ink-3" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Karten durchsuchen"
                    aria-label="Karten durchsuchen"
                    className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} aria-label="Suche leeren" className="text-ink-3">
                      <X size={16} />
                    </button>
                  )}
                </label>
                <button onClick={() => setSelecting(true)} className="min-h-10 px-1 text-[15px] font-medium text-accent">
                  Auswählen
                </button>
              </>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-ink-2">Keine Karte passt zu „{query}“.</p>
          ) : (
            <div className="space-y-2.5 pb-24">
              {filtered.map((c) => (
                <CardRow
                  key={c.id}
                  card={c}
                  selecting={selecting}
                  selected={selected.has(c.id)}
                  onOpen={() => navigate(`/karte/${c.id}/bearbeiten`)}
                  onToggle={() => toggle(c.id)}
                  onMenu={() => cardActions.openMenu(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {createPortal(
      <AnimatePresence>
        {cards.length > 0 && !selecting && (
          <motion.div
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+16px)] right-[max(20px,calc(50vw-220px))] z-20 flex flex-col items-center gap-3"
          >
            <Pressable
              onClick={() => navigate(`/stapel/${deck.id}/sprache`)}
              aria-label="Karte per Sprache erstellen"
              className="flex size-12 items-center justify-center rounded-full border border-line bg-surface text-accent shadow-lift"
            >
              <Mic size={22} />
            </Pressable>
            <Pressable
              onClick={newCard}
              aria-label="Neue Karte"
              className="flex size-14 items-center justify-center rounded-full accent-gradient text-white shadow-[0_12px_28px_-8px_var(--accent)]"
            >
              <Plus size={26} strokeWidth={2.5} />
            </Pressable>
          </motion.div>
        )}
        {selecting && (
          <motion.div
            key="bulk"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+12px)] z-20 mx-auto w-[calc(100%-24px)] max-w-[456px]"
          >
            <div className="glass grid grid-cols-4 rounded-2xl border border-line p-1.5 shadow-lift">
              <BulkButton icon={FolderInput} label="Verschieben" disabled={!ids.length} onClick={() => cardActions.move(ids)} />
              <BulkButton icon={Flag} label={allFlagged ? 'Entmarkieren' : 'Markieren'} disabled={!ids.length} onClick={() => void cardActions.flag(ids, !allFlagged)} />
              <BulkButton icon={Tag} label="Schlagwort" disabled={!ids.length} onClick={() => cardActions.openTags(ids)} />
              <BulkButton icon={Trash2} label="Löschen" danger disabled={!ids.length} onClick={() => void cardActions.trash(ids)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}

      {dialogs.dialogs}
      {cardActions.dialogs}
    </>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className="p-3.5 text-center">
      <p className={`text-[22px] font-bold tabular-nums leading-none ${highlight ? 'text-accent' : ''}`}>{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-2">{label}</p>
    </Card>
  )
}

interface BulkButtonProps {
  icon: typeof Flag
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

function BulkButton({ icon: Icon, label, onClick, disabled, danger }: BulkButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11.5px] font-medium active:bg-surface-2 disabled:opacity-35 ${danger ? 'text-danger' : 'text-ink'}`}
    >
      <Icon size={20} className={danger ? 'text-danger' : 'text-accent'} />
      {label}
    </button>
  )
}
