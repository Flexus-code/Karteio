import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LearningSettings {
  /** Neue Karten pro Tag */
  dailyNewLimit: number
  /** Wiederholungen pro Tag */
  dailyReviewLimit: number
  /** Ziel-Behaltensrate für FSRS (0.7–0.97) */
  retention: number
  /** Antworten im Schreibmodus mit kleinen Tippfehlern gelten als richtig */
  typoTolerance: boolean
  /** Antworten pro Tag als Ziel */
  dailyGoal: number
  /** Prüfungsdatum als JJJJ-MM-TT */
  examDate: string | null
  examName: string
}

interface SettingsState extends LearningSettings {
  update: (patch: Partial<LearningSettings>) => void
}

export const DEFAULT_SETTINGS: LearningSettings = {
  dailyNewLimit: 20,
  dailyReviewLimit: 200,
  retention: 0.9,
  typoTolerance: true,
  dailyGoal: 30,
  examDate: null,
  examName: 'IHK-Abschlussprüfung',
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
    }),
    { name: 'karteio-settings' },
  ),
)
