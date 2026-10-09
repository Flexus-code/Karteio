import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'
export type AccentColor = 'green' | 'indigo' | 'violet' | 'blue' | 'teal' | 'rose' | 'amber'

export const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: 'green', label: 'Grün', color: '#16a34a' },
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
  onboardingDone: boolean
  setTheme: (theme: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  dismissInstallHint: () => void
  setOnboardingDone: (done: boolean) => void
}

/** Kleine UI-Einstellungen, die schon vor dem Laden der Datenbank gebraucht werden (localStorage). */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'green',
      installHintDismissed: false,
      onboardingDone: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      dismissInstallHint: () => set({ installHintDismissed: true }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
    }),
    {
      name: 'karteio-ui',
      version: 1,
      // v0 → v1: Standardfarbe ist jetzt Grün (Indigo war vorher nur der Standard, keine bewusste Wahl)
      migrate: (persisted, version) => {
        const state = persisted as Partial<UiState>
        if (version < 1 && state.accent === 'indigo') state.accent = 'green'
        return state as UiState
      },
    },
  ),
)
