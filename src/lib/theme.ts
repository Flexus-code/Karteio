import { useEffect } from 'react'
import { useUiStore } from '@/store/ui'

const THEME_COLORS = { light: '#f6f6fb', dark: '#0b0b12' }

/** Synchronisiert Theme und Akzentfarbe mit <html> und reagiert auf System-Änderungen. */
export function useApplyTheme() {
  const theme = useUiStore((s) => s.theme)
  const accent = useUiStore((s) => s.accent)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      const root = document.documentElement
      root.classList.toggle('dark', dark)
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light))
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])
}
