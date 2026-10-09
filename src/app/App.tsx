import { HashRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { AppShell } from './AppShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HomePage } from '@/pages/HomePage'
import { FoldersPage } from '@/pages/FoldersPage'
import { DeckPage } from '@/pages/DeckPage'
import { LearnPage } from '@/pages/LearnPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SearchPage } from '@/pages/SearchPage'
import { TrashPage } from '@/pages/TrashPage'

// Der Editor (TipTap) ist groß – erst laden, wenn er gebraucht wird
const CardEditorPage = lazy(() => import('@/pages/CardEditorPage').then((m) => ({ default: m.CardEditorPage })))

const StudySessionPage = lazy(() => import('@/pages/StudySessionPage').then((m) => ({ default: m.StudySessionPage })))

const session = (
  <Suspense fallback={<LibrarySkeleton />}>
    <StudySessionPage />
  </Suspense>
)

const VoiceCreatePage = lazy(() => import('@/pages/VoiceCreatePage').then((m) => ({ default: m.VoiceCreatePage })))

const voice = (
  <Suspense fallback={<LibrarySkeleton />}>
    <VoiceCreatePage />
  </Suspense>
)

const PrintPage = lazy(() => import('@/pages/PrintPage').then((m) => ({ default: m.PrintPage })))

const print = (
  <Suspense fallback={<LibrarySkeleton />}>
    <PrintPage />
  </Suspense>
)

const editor = (
  <Suspense fallback={<LibrarySkeleton />}>
    <CardEditorPage />
  </Suspense>
)

export function App() {
  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="ordner" element={<FoldersPage />} />
            <Route path="ordner/:folderId" element={<FoldersPage />} />
            <Route path="stapel/:deckId" element={<DeckPage />} />
            <Route path="stapel/:deckId/neu" element={editor} />
            <Route path="stapel/:deckId/sprache" element={voice} />
            <Route path="stapel/:deckId/druck" element={print} />
            <Route path="suche" element={<SearchPage />} />
            <Route path="papierkorb" element={<TrashPage />} />
            <Route path="karte/:cardId/bearbeiten" element={editor} />
            <Route path="lernen" element={<LearnPage />} />
            <Route path="lernen/sitzung" element={session} />
            <Route path="statistik" element={<StatsPage />} />
            <Route path="einstellungen" element={<SettingsPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </MotionConfig>
    </ErrorBoundary>
  )
}
