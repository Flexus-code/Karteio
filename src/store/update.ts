import { create } from 'zustand'

interface UpdateState {
  /** Eine neue Version ist heruntergeladen und wartet */
  needRefresh: boolean
  registration: ServiceWorkerRegistration | null
  /** Aktiviert die neue Version und lädt die App neu */
  apply: (() => Promise<void>) | null
  /** Hinweis-Banner wurde für diese Version weggeklickt */
  dismissed: boolean
}

export const useUpdateStore = create<UpdateState>()(() => ({
  needRefresh: false,
  registration: null,
  apply: null,
  dismissed: false,
}))

/**
 * Fragt beim Server nach einer neuen Version.
 * Gibt `true` zurück, wenn ein Update bereitsteht, `false` wenn die App aktuell ist,
 * `null` wenn keine Prüfung möglich ist (z. B. im Entwicklungsmodus).
 */
export async function checkForUpdate(): Promise<boolean | null> {
  const { registration } = useUpdateStore.getState()
  if (!registration) return null
  try {
    await registration.update()
  } catch {
    return null // offline
  }
  // Eine gefundene Version wird erst installiert – kurz darauf warten
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    if (useUpdateStore.getState().needRefresh || registration.waiting) return true
    if (!registration.installing) break
    await new Promise((r) => setTimeout(r, 250))
  }
  return useUpdateStore.getState().needRefresh || Boolean(registration.waiting)
}
