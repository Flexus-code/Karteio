import { Navigate, useParams } from 'react-router-dom'
import { LibraryView } from '@/features/library/LibraryView'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { useLibrary } from '@/features/library/useLibrary'

export function FoldersPage() {
  const { folderId = null } = useParams()
  const library = useLibrary()

  if (!library) return <LibrarySkeleton />
  if (folderId && !library.folders.has(folderId)) return <Navigate to="/ordner" replace />
  return <LibraryView library={library} folderId={folderId} />
}
