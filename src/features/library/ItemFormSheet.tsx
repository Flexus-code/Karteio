import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import type { ItemColor } from '@/db/types'
import { COLOR_KEYS, DECK_ICONS, FOLDER_ICONS, ITEM_COLORS } from '@/lib/colors'
import { ItemIcon } from './ItemIcon'

export interface ItemFormValues {
  name: string
  description: string
  icon: string
  color: ItemColor
}

interface ItemFormSheetProps {
  open: boolean
  kind: 'folder' | 'deck'
  /** Vorhandene Werte beim Bearbeiten */
  initial?: ItemFormValues
  onClose: () => void
  onSubmit: (values: ItemFormValues) => Promise<void> | void
}

const DEFAULTS: Record<'folder' | 'deck', ItemFormValues> = {
  folder: { name: '', description: '', icon: '📁', color: 'indigo' },
  deck: { name: '', description: '', icon: '🗂️', color: 'blue' },
}

export function ItemFormSheet({ open, kind, initial, onClose, onSubmit }: ItemFormSheetProps) {
  const [values, setValues] = useState<ItemFormValues>(initial ?? DEFAULTS[kind])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setValues(initial ?? DEFAULTS[kind])
  }, [open, initial, kind])

  const isEdit = Boolean(initial)
  const noun = kind === 'folder' ? 'Ordner' : 'Stapel'
  const icons = kind === 'folder' ? FOLDER_ICONS : DECK_ICONS
  const valid = values.name.trim().length > 0

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    try {
      await onSubmit(values)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? `${noun} bearbeiten` : `Neuer ${noun}`}
      footer={
        <Button block disabled={!valid || busy} onClick={() => void submit()}>
          {isEdit ? 'Speichern' : `${noun} erstellen`}
        </Button>
      }
    >
      <form onSubmit={submit} className="space-y-5 pt-2">
        <div className="flex justify-center py-2">
          <motion.div key={values.icon + values.color} initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            <ItemIcon icon={values.icon} color={values.color} size={76} variant={kind} />
          </motion.div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Name</span>
          <input
            autoFocus={!isEdit}
            value={values.name}
            maxLength={60}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder={kind === 'folder' ? 'z. B. Wirtschafts- und Sozialkunde' : 'z. B. OSI-Modell'}
            enterKeyHint="done"
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </label>

        {kind === 'deck' && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Beschreibung (optional)</span>
            <textarea
              value={values.description}
              maxLength={200}
              rows={2}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Worum geht es in diesem Stapel?"
              className="w-full resize-none rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </label>
        )}

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-2">Farbe</legend>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_KEYS.map((c) => {
              const active = values.color === c
              return (
                <motion.button
                  key={c}
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setValues((v) => ({ ...v, color: c }))}
                  aria-label={ITEM_COLORS[c].label}
                  aria-pressed={active}
                  className="relative mx-auto flex size-11 items-center justify-center rounded-full"
                  style={{ background: `linear-gradient(135deg, ${ITEM_COLORS[c].from}, ${ITEM_COLORS[c].to})` }}
                >
                  <AnimatePresence>
                    {active && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Check size={18} strokeWidth={3} className="text-white" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-2">Symbol</legend>
          <div className="grid grid-cols-6 gap-2">
            {icons.map((icon) => {
              const active = values.icon === icon
              return (
                <motion.button
                  key={icon}
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setValues((v) => ({ ...v, icon }))}
                  aria-pressed={active}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-[24px] transition-colors ${active ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2'}`}
                >
                  {icon}
                </motion.button>
              )
            })}
          </div>
        </fieldset>
      </form>
    </Sheet>
  )
}
