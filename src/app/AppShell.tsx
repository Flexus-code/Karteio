import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { InstallHint } from '@/components/InstallHint'
import { SplashScreen } from '@/components/SplashScreen'
import { TabBar } from '@/components/TabBar'
import { Toaster } from '@/components/Toaster'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { useApplyTheme } from '@/lib/theme'
import { useUiStore } from '@/store/ui'

/** Rahmen der App: zentrierte Handy-Ansicht, animierter Seiteninhalt, Tab-Bar. */
export function AppShell() {
  useApplyTheme()
  const location = useLocation()
  const outlet = useOutlet()
  // Vollbild-Seiten (Editor) ohne Tab-Bar
  const fullscreen = /\/(neu|bearbeiten)$/.test(location.pathname)
  const onboardingDone = useUiStore((s) => s.onboardingDone)
  const setOnboardingDone = useUiStore((s) => s.setOnboardingDone)

  return (
    <div className="flex h-full justify-center bg-bg">
      <div className="relative h-full w-full max-w-[480px] overflow-hidden bg-bg md:border-x md:border-line">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.main
            key={location.pathname}
            className={`scroll-area absolute inset-0 pt-safe ${fullscreen ? '' : 'pb-[calc(var(--tabbar-h)+var(--safe-bottom)+16px)]'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.25, 0.8, 0.3, 1] }}
          >
            {outlet}
          </motion.main>
        </AnimatePresence>
        <AnimatePresence>{!fullscreen && <TabBar key="tabbar" />}</AnimatePresence>
        <Toaster />
        <UpdatePrompt />
        {onboardingDone && <InstallHint />}
        <AnimatePresence>{!onboardingDone && <Onboarding key="onboarding" onDone={() => setOnboardingDone(true)} />}</AnimatePresence>
        <SplashScreen />
      </div>
    </div>
  )
}
