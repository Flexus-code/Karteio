import { HashRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppShell } from './AppShell'
import { HomePage } from '@/pages/HomePage'
import { FoldersPage } from '@/pages/FoldersPage'
import { LearnPage } from '@/pages/LearnPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="ordner/*" element={<FoldersPage />} />
            <Route path="lernen" element={<LearnPage />} />
            <Route path="statistik" element={<StatsPage />} />
            <Route path="einstellungen" element={<SettingsPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </MotionConfig>
  )
}
