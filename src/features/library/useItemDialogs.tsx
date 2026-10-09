import { FolderInput, FolderPlus, Layers, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionSheet, type ActionItem } from '@/components/ActionSheet'
import type { Deck, Folder, Id } from '@/db/types'
import { toast } from '@/store/toast'
import { ItemFormSheet, type ItemFormValues } from './ItemFormSheet'
import { ItemIcon } from './ItemIcon'
import { MoveSheet } from './MoveSheet'
import * as repo from './repo'
import type { Library } from './tree'

type Target = { kind: 'folder'; item: Folder } | { kind: 'deck'; item: Deck }
type FormState =
  | { mode: 'create'; kind: 'folder' | 'deck'; parentId: Id | null }
  | { mode: 'edit'; target: Target; initial: ItemFormValues }

interface Options {
  /** Wird aufgerufen, nachdem ein Element in den Papierkorb verschoben wurde */
  onTrashed?: (target: Target) => void
}

/** Bündelt Kontextmenü, Erstellen/Bearbeiten und Verschieben für Ordner und Stapel. */
export function useItemDialogs(library: Library | undefined, { onTrashed }: Options = {}) {
  const navigate = useNavigate()
  const [menu, setMenu] = useState<Target | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [move, setMove] = useState<Target | null>(null)

  const open = (t: Target) => navigate(t.kind === 'folder' ? `/ordner/${t.item.id}` : `/stapel/${t.item.id}`)

  const edit = (t: Target) =>
    setForm({
      mode: 'edit',
      target: t,
      initial: {
        name: t.item.name,
        description: t.kind === 'deck' ? t.item.description : '',
        icon: t.item.icon,
        color: t.item.color,
      },
    })

  const trash = async (t: Target) => {
    if (t.kind === 'folder') await repo.trashFolder(t.item.id)
    else await repo.trashDeck(t.item.id)
    onTrashed?.(t)
    toast(`„${t.item.name}“ in den Papierkorb verschoben`, {
      action: {
        label: 'Rückgängig',
        run: async () => {
          if (t.kind === 'folder') await repo.restoreFolder(t.item.id)
          else await repo.restoreDeck(t.item.id)
        },
      },
    })
  }

  const submitForm = async (values: ItemFormValues) => {
    if (!form) return
    if (form.mode === 'create') {
      if (form.kind === 'folder') {
        await repo.createFolder({ name: values.name, icon: values.icon, color: values.color, parentId: form.parentId })
      } else {
        await repo.createDeck({ ...values, folderId: form.parentId })
      }
      toast(`${form.kind === 'folder' ? 'Ordner' : 'Stapel'} „${values.name.trim()}“ erstellt`, { tone: 'success' })
    } else if (form.target.kind === 'folder') {
      await repo.updateFolder(form.target.item.id, { name: values.name, icon: values.icon, color: values.color })
    } else {
      await repo.updateDeck(form.target.item.id, values)
    }
  }

  const menuActions = (t: Target): ActionItem[] => [
    { label: 'Öffnen', icon: ExternalLink, onSelect: () => open(t) },
    { label: 'Bearbeiten', icon: Pencil, onSelect: () => edit(t) },
    ...(t.kind === 'folder'
      ? [
          { label: 'Unterordner erstellen', icon: FolderPlus, onSelect: () => setForm({ mode: 'create', kind: 'folder', parentId: t.item.id }) },
          { label: 'Stapel darin erstellen', icon: Layers, onSelect: () => setForm({ mode: 'create', kind: 'deck', parentId: t.item.id }) },
        ]
      : []),
    { label: 'Verschieben', icon: FolderInput, onSelect: () => setMove(t) },
    { label: 'In den Papierkorb', icon: Trash2, danger: true, onSelect: () => void trash(t) },
  ]

  const dialogs: ReactNode = (
    <>
      <ActionSheet
        open={menu !== null}
        onClose={() => setMenu(null)}
        header={
          menu && (
            <div className="flex items-center gap-3 px-1">
              <ItemIcon icon={menu.item.icon} color={menu.item.color} size={44} variant={menu.kind} />
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold">{menu.item.name}</p>
                <p className="text-[13px] text-ink-2">{menu.kind === 'folder' ? 'Ordner' : 'Stapel'}</p>
              </div>
            </div>
          )
        }
        actions={menu ? menuActions(menu) : []}
      />
      <ItemFormSheet
        open={form !== null}
        kind={form ? (form.mode === 'create' ? form.kind : form.target.kind) : 'folder'}
        initial={form?.mode === 'edit' ? form.initial : undefined}
        onClose={() => setForm(null)}
        onSubmit={submitForm}
      />
      {library && move && (
        <MoveSheet
          open
          onClose={() => setMove(null)}
          library={library}
          itemName={move.item.name}
          currentParentId={move.kind === 'folder' ? move.item.parentId : move.item.folderId}
          movingFolderId={move.kind === 'folder' ? move.item.id : undefined}
          onMove={async (targetId) => {
            if (move.kind === 'folder') await repo.moveFolder(move.item.id, targetId)
            else await repo.moveDeck(move.item.id, targetId)
            const targetName = targetId ? library.folders.get(targetId)?.name : 'Oberste Ebene'
            toast(`Nach „${targetName}“ verschoben`, { tone: 'success' })
          }}
        />
      )}
    </>
  )

  return {
    dialogs,
    openMenu: setMenu,
    openItem: open,
    edit,
    trash,
    move: setMove,
    create: (kind: 'folder' | 'deck', parentId: Id | null) => setForm({ mode: 'create', kind, parentId }),
  }
}

export type { Target as ItemTarget }
