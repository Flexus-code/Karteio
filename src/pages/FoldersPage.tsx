import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function FoldersPage() {
  return (
    <>
      <PageHeader title="Ordner" />
      <EmptyState
        icon={FolderOpen}
        title="Noch keine Ordner"
        text="Organisiere deine Karteikarten in Ordnern und Stapeln – zum Beispiel nach Prüfungsbereich."
        action={
          <Button>
            <Plus size={18} /> Ordner erstellen
          </Button>
        }
      />
    </>
  )
}
