import { MotionGlobalConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { requestPersistentStorage } from '@/lib/storage'
import { collectOrphanMedia } from '@/features/cards/repo'
import { purgeExpiredTrash } from '@/features/library/repo'
import '@/styles/index.css'

// Nur für Tests in der Entwicklung: ?noanim schaltet alle Animationen ab
if (import.meta.env.DEV && new URLSearchParams(location.search).has('noanim')) MotionGlobalConfig.skipAnimations = true

void requestPersistentStorage()
void purgeExpiredTrash().then(() => collectOrphanMedia())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
