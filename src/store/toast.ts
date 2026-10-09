import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone?: 'default' | 'success' | 'danger'
  action?: { label: string; run: () => void | Promise<void> }
  durationMs: number
}

interface ToastState {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => void
  dismiss: (id: number) => void
}

let counter = 0

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (toast) => {
    const id = ++counter
    // Es wird immer nur der neueste Toast gezeigt
    set({ toasts: [{ durationMs: toast.action ? 5000 : 2600, ...toast, id }] })
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, options: Partial<Omit<Toast, 'id' | 'message'>> = {}) =>
  useToastStore.getState().show({ message, ...options })
