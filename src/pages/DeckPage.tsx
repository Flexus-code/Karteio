import { motion } from 'framer-motion'
import { ChevronLeft, MoreHorizontal, PenLine, Plus } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ItemIcon } from '@/features/library/ItemIcon'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { useItemDialogs } from '@/features/library/useItemDialogs'
import { useLibrary } from '@/features/library/useLibrary'
import { toast } from '@/store/toast'

export function DeckPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const library = useLibrary()
  const deck = library?.decks.get(deckId)
  const backTo = deck?.folderId ? `/ordner/${deck.folderId}` : '/ordner'
  const dialogs = useItemDialogs(library, {
    onTrashed: () => navigate(backTo, { replace: true }),
  })

  if (!library) return <LibrarySkeleton />
  if (!deck) return <Navigate to="/ordner" replace />

  const stats = library.statsForDeck(deck.id)
  const backLabel = deck.folderId ? (library.folders.get(deck.folderId)?.name ?? 'Ordner') : 'Ordner'

  return (
    <>
      <header className="px-5 pb-5 pt-2">
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
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-2 grid grid-cols-3 gap-3 px-5"
      >
        <Stat label="Karten" value={stats.total} />
        <Stat label="Fällig" value={stats.due} highlight={stats.due > 0} />
        <Stat label="Beherrscht" value={`${Math.round(stats.progress * 100)} %`} />
      </motion.div>

      <EmptyState
        icon={PenLine}
        title="Noch keine Karten"
        text="Schreib deine erste Karteikarte – Vorderseite mit der Frage, Rückseite mit der Antwort."
        action={
          <Button onClick={() => toast('Der Karten-Editor kommt in Meilenstein 3')}>
            <Plus size={18} /> Karte hinzufügen
          </Button>
        }
      />
      {dialogs.dialogs}
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
