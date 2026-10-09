import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, FolderOpen, FolderPlus, Layers, MoreHorizontal, Play, Plus } from 'lucide-react'
import { quickStudy } from '@/features/study/session'
import { toast } from '@/store/toast'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionSheet } from '@/components/ActionSheet'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Pressable } from '@/components/Pressable'
import type { Folder, Id } from '@/db/types'
import { ItemIcon } from './ItemIcon'
import { ItemRow } from './ItemRow'
import { ReorderList } from './ReorderList'
import * as repo from './repo'
import type { ItemStats, Library } from './tree'
import { useItemDialogs } from './useItemDialogs'

interface LibraryViewProps {
  library: Library
  folderId: Id | null
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`
}

export function LibraryView({ library, folderId }: LibraryViewProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const folder = folderId ? library.folders.get(folderId) : undefined
  const parentId = folder?.parentId ?? null

  const dialogs = useItemDialogs(library, {
    onTrashed: (t) => {
      // Wird der aktuell geöffnete Ordner gelöscht, zurück zum Elternordner
      if (t.kind === 'folder' && t.item.id === folderId) navigate(parentId ? `/ordner/${parentId}` : '/ordner', { replace: true })
    },
  })

  const folders = library.foldersIn(folderId)
  const decks = library.decksIn(folderId)
  const isEmpty = folders.length === 0 && decks.length === 0
  const canSort = folders.length > 1 || decks.length > 1

  const folderSubtitle = (f: Folder) => {
    const sub = library.foldersIn(f.id).length
    const d = library.decksIn(f.id).length
    const stats = library.statsForFolder(f.id)
    const parts = [sub > 0 && plural(sub, 'Ordner', 'Ordner'), plural(d, 'Stapel', 'Stapel'), stats.total > 0 && plural(stats.total, 'Karte', 'Karten')]
    return parts.filter(Boolean).join(' · ')
  }

  const addButton = (
    <Pressable
      onClick={() => setAddOpen(true)}
      aria-label="Neu erstellen"
      className="flex size-11 items-center justify-center rounded-full accent-gradient text-white shadow-[0_8px_20px_-8px_var(--accent)]"
    >
      <Plus size={22} strokeWidth={2.5} />
    </Pressable>
  )

  const sortButton = canSort && (
    <button onClick={() => setSorting((s) => !s)} className="min-h-11 rounded-full px-3 text-[15px] font-semibold text-accent">
      {sorting ? 'Fertig' : 'Sortieren'}
    </button>
  )

  return (
    <>
      {folder ? (
        <FolderHeader
          library={library}
          folder={folder}
          stats={library.statsForFolder(folder.id)}
          onBack={() => navigate(parentId ? `/ordner/${parentId}` : '/ordner')}
          onMenu={() => dialogs.openMenu({ kind: 'folder', item: folder })}
          actions={
            <>
              {sortButton}
              {addButton}
            </>
          }
        />
      ) : (
        <PageHeader
          title="Ordner"
          subtitle={library.decks.size > 0 ? plural(library.totalStats().total, 'Karte', 'Karten') + ' insgesamt' : undefined}
          action={
            <div className="flex items-center gap-1">
              {sortButton}
              {addButton}
            </div>
          }
        />
      )}

      {isEmpty ? (
        <EmptyState
          icon={folder ? Layers : FolderOpen}
          title={folder ? 'Dieser Ordner ist leer' : 'Noch keine Ordner'}
          text={
            folder
              ? 'Lege Unterordner oder Stapel an, um deine Karteikarten zu sortieren.'
              : 'Organisiere deine Karteikarten in Ordnern und Stapeln – zum Beispiel nach Prüfungsbereich.'
          }
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => dialogs.create('folder', folderId)}>
                <FolderPlus size={18} /> {folder ? 'Unterordner erstellen' : 'Ordner erstellen'}
              </Button>
              <Button variant="ghost" onClick={() => dialogs.create('deck', folderId)}>
                <Layers size={18} /> Stapel erstellen
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6 px-5">
          {folders.length > 0 && (
            <section>
              <SectionTitle>Ordner</SectionTitle>
              <ReorderList
                items={folders}
                sorting={sorting}
                onReorder={(ids) => void repo.reorderFolders(ids)}
                renderItem={(f, controls) => (
                  <ItemRow
                    kind="folder"
                    id={f.id}
                    name={f.name}
                    icon={f.icon}
                    color={f.color}
                    subtitle={folderSubtitle(f)}
                    stats={library.statsForFolder(f.id)}
                    sorting={sorting}
                    dragControls={controls}
                    onOpen={() => dialogs.openItem({ kind: 'folder', item: f })}
                    onMenu={() => dialogs.openMenu({ kind: 'folder', item: f })}
                  />
                )}
              />
            </section>
          )}
          {decks.length > 0 && (
            <section>
              <SectionTitle>Stapel</SectionTitle>
              <ReorderList
                items={decks}
                sorting={sorting}
                onReorder={(ids) => void repo.reorderDecks(ids)}
                renderItem={(d, controls) => {
                  const stats = library.statsForDeck(d.id)
                  return (
                    <ItemRow
                      kind="deck"
                      id={d.id}
                      name={d.name}
                      icon={d.icon}
                      color={d.color}
                      subtitle={[plural(stats.total, 'Karte', 'Karten'), stats.newCount > 0 && `${stats.newCount} neu`].filter(Boolean).join(' · ')}
                      stats={stats}
                      sorting={sorting}
                      dragControls={controls}
                      onOpen={() => dialogs.openItem({ kind: 'deck', item: d })}
                      onMenu={() => dialogs.openMenu({ kind: 'deck', item: d })}
                    />
                  )
                }}
              />
            </section>
          )}
          <p className="pb-2 text-center text-[12.5px] text-ink-3">Tipp: Lange drücken für weitere Aktionen</p>
        </div>
      )}

      <ActionSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        actions={[
          { label: folder ? 'Neuer Unterordner' : 'Neuer Ordner', icon: FolderPlus, onSelect: () => dialogs.create('folder', folderId) },
          { label: 'Neuer Stapel', icon: Layers, onSelect: () => dialogs.create('deck', folderId) },
        ]}
      />
      {dialogs.dialogs}
    </>
  )
}

export function StudyButton({ scope, due, label }: { scope: Parameters<typeof quickStudy>[0]; due: number; label: string }) {
  const navigate = useNavigate()
  return (
    <Pressable
      onClick={async () => {
        if (await quickStudy(scope)) navigate('/lernen/sitzung')
        else toast('Hier gibt es noch keine Karten zum Lernen.')
      }}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl accent-gradient text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_var(--accent)]"
    >
      <Play size={16} fill="currentColor" /> {label}
      {due > 0 && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[12px] font-bold">{due}</span>}
    </Pressable>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
}

interface FolderHeaderProps {
  library: Library
  folder: Folder
  stats: ItemStats
  onBack: () => void
  onMenu: () => void
  actions: React.ReactNode
}

function FolderHeader({ library, folder, stats, onBack, onMenu, actions }: FolderHeaderProps) {
  const path = library.path(folder.parentId)
  const backLabel = path.at(-1)?.name ?? 'Ordner'

  return (
    <header className="px-5 pb-5 pt-2">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onBack} className="-ml-2 flex min-h-11 min-w-0 items-center gap-0.5 pr-2 text-[16px] font-medium text-accent">
          <ChevronLeft size={24} className="shrink-0" />
          <span className="truncate">{backLabel}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onMenu} aria-label="Ordner-Aktionen" className="flex size-11 items-center justify-center rounded-full text-accent">
            <MoreHorizontal size={22} />
          </button>
          {actions}
        </div>
      </div>

      <nav aria-label="Pfad" className="scroll-area -mx-5 mb-3 flex items-center gap-1 overflow-x-auto px-5 text-[13px] text-ink-3">
        <Link to="/ordner" className="shrink-0 hover:text-accent">
          Ordner
        </Link>
        {path.map((p) => (
          <span key={p.id} className="flex shrink-0 items-center gap-1">
            <ChevronRight size={13} />
            <Link to={`/ordner/${p.id}`} className="hover:text-accent">
              {p.name}
            </Link>
          </span>
        ))}
        <ChevronRight size={13} className="shrink-0" />
        <span className="shrink-0 font-medium text-ink-2">{folder.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        <ItemIcon icon={folder.icon} color={folder.color} size={64} layoutId={`icon-${folder.id}`} />
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">{folder.name}</h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13.5px] text-ink-2">
            {stats.total} Karten · {stats.due} fällig · {Math.round(stats.progress * 100)} % beherrscht
          </motion.p>
        </div>
      </div>
      {stats.total > 0 && <StudyButton scope={{ kind: 'folder', id: folder.id }} due={stats.due + stats.newCount} label="Ganzen Ordner lernen" />}
    </header>
  )
}
