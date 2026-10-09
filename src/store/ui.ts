import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'
export type AccentColor = 'indigo' | 'violet' | 'blue' | 'teal' | 'rose' | 'amber'

export const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { id: 'violet', label: 'Violett', color: '#7c3aed' },
  { id: 'blue', label: 'Blau', color: '#2563eb' },
  { id: 'teal', label: 'Türkis', color: '#0d9488' },
  { id: 'rose', label: 'Rosé', color: '#e11d48' },
  { id: 'amber', label: 'Bernstein', color: '#d97706' },
]

interface UiState {
  theme: ThemeMode
  accent: AccentColor
  installHintDismissed: boolean
  setTheme: (theme: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  dismissInstallHint: () => void
}

/** Kleine UI-Einstellungen, die schon vor dem Laden der Datenbank gebraucht werden (localStorage). */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'indigo',
      installHintDismissed: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      dismissInstallHint: () => set({ installHintDismissed: true }),
    }),
    { name: 'karteio-ui' },
  ),
)
