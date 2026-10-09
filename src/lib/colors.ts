import type { ItemColor } from '@/db/types'

/** Farben für Ordner und Stapel: [Hauptfarbe, zweite Verlaufsfarbe] */
export const ITEM_COLORS: Record<ItemColor, { label: string; from: string; to: string }> = {
  indigo: { label: 'Indigo', from: '#6366f1', to: '#4f46e5' },
  violet: { label: 'Violett', from: '#a855f7', to: '#7c3aed' },
  blue: { label: 'Blau', from: '#3b82f6', to: '#2563eb' },
  cyan: { label: 'Cyan', from: '#22d3ee', to: '#0891b2' },
  teal: { label: 'Türkis', from: '#2dd4bf', to: '#0d9488' },
  green: { label: 'Grün', from: '#4ade80', to: '#16a34a' },
  amber: { label: 'Gelb', from: '#fbbf24', to: '#d97706' },
  orange: { label: 'Orange', from: '#fb923c', to: '#ea580c' },
  rose: { label: 'Rot', from: '#fb7185', to: '#e11d48' },
  slate: { label: 'Grau', from: '#94a3b8', to: '#475569' },
}

export const COLOR_KEYS = Object.keys(ITEM_COLORS) as ItemColor[]

export function colorGradient(color: ItemColor): string {
  const c = ITEM_COLORS[color] ?? ITEM_COLORS.indigo
  return `linear-gradient(135deg, ${c.from}, ${c.to})`
}

export const FOLDER_ICONS = ['📁', '📚', '💻', '🧠', '🌐', '🔐', '⚙️', '🗄️', '📊', '💶', '⚖️', '📐', '🧪', '🌍', '🗣️', '📝', '🎯', '💡', '🏢', '🧾', '🛠️', '📱', '🎓', '⭐']
export const DECK_ICONS = ['🗂️', '📇', '📘', '📗', '📙', '📕', ...FOLDER_ICONS.slice(1)]
