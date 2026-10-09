import { Check, ChevronDown, Layers } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { Sheet } from '@/components/Sheet'
import { Switch } from '@/components/Switch'
import type { Id } from '@/db/types'
import { allTags } from '@/features/cards/repo'
import { ItemIcon } from '@/features/library/ItemIcon'
import type { Library } from '@/features/library/tree'
import { toast } from '@/store/toast'
import { buildItems, startSession } from '../session'
import { MODE_INFO, type Scope, type StudyConfig } from '../types'

interface StudySetupSheetProps {
  open: boolean
  onClose: () => void
  library: Library
  initial: StudyConfig
}

const LIMITS: { label: string; value: number | null }[] = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: 'Alle', value: null },
]
const EXAM_COUNTS = [10, 20, 30, 50]
const EXAM_MINUTES = [10, 20, 30, 60, 90]

export function scopeLabel(library: Library, scope: Scope) {
  if (scope.kind === 'folder') return library.folders.get(scope.id)?.name ?? 'Ordner'
  if (scope.kind === 'deck') return library.decks.get(scope.id)?.name ?? 'Stapel'
  return 'Alle Karten'
}

export function StudySetupSheet({ open, onClose, library, initial }: StudySetupSheetProps) {
  const navigate = useNavigate()
  const [config, setConfig] = useState(initial)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfig(initial)
    setScopeOpen(false)
    void allTags().then(setTags)
  }, [open, initial])

  // Live-Vorschau: wie viele Karten passen?
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void buildItems(config).then(({ items }) => !cancelled && setCount(items.length))
    return () => {
      cancelled = true
    }
  }, [open, config])

  const set = (p: Partial<StudyConfig>) => setConfig((c) => ({ ...c, ...p }))
  const mode = config.mode
  const info = MODE_INFO[mode]

  const start = async () => {
    setBusy(true)
    try {
      const n = await startSession(config)
      if (n === 0) {
        toast('Keine Karten gefunden – passe die Auswahl an.')
        return
      }
      onClose()
      navigate('/lernen/sitzung')
    } finally {
      setBusy(false)
    }
  }

  const scopeRows: { scope: Scope; depth: number; icon: ReactNode; name: string }[] = []
  const walk = (parentId: Id | null, depth: number) => {
    for (const f of library.foldersIn(parentId)) {
      scopeRows.push({ scope: { kind: 'folder', id: f.id }, depth, icon: <ItemIcon icon={f.icon} color={f.color} size={30} />, name: f.name })
      walk(f.id, depth + 1)
    }
    for (const d of library.decksIn(parentId)) {
      scopeRows.push({ scope: { kind: 'deck', id: d.id }, depth, icon: <ItemIcon icon={d.icon} color={d.color} size={30} variant="deck" />, name: d.name })
    }
  }
  walk(null, 0)
  const sameScope = (a: Scope, b: Scope) => a.kind === b.kind && (a.kind === 'all' || (b.kind !== 'all' && a.id === b.id))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={info.label}
      footer={
        <Button block disabled={busy || count === 0} onClick={() => void start()}>
          {count === null ? 'Starten' : count === 0 ? 'Keine passenden Karten' : `${count} ${count === 1 ? 'Karte' : 'Karten'} lernen`}
        </Button>
      }
    >
      <div className="space-y-5 pb-2 pt-1">
        <p className="text-center text-[14px] text-ink-2">{info.description}</p>

        <Group title="Bereich">
          <button onClick={() => setScopeOpen((o) => !o)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left">
            <Layers size={18} className="text-accent" />
            <span className="flex-1 truncate text-[15px] font-medium">{scopeLabel(library, config.scope)}</span>
            <ChevronDown size={18} className={`text-ink-3 transition-transform ${scopeOpen ? 'rotate-180' : ''}`} />
          </button>
          {scopeOpen && (
            <ul className="max-h-72 overflow-y-auto border-t border-line py-1">
              {[{ scope: { kind: 'all' } as Scope, depth: 0, icon: <Layers size={18} className="mx-1.5 text-ink-2" />, name: 'Alle Karten' }, ...scopeRows].map((r) => (
                <li key={r.scope.kind === 'all' ? 'all' : r.scope.id}>
                  <button
                    onClick={() => {
                      set({ scope: r.scope })
                      setScopeOpen(false)
                    }}
                    className="flex min-h-11 w-full items-center gap-2.5 pr-4 text-left active:bg-surface-2"
                    style={{ paddingLeft: 16 + r.depth * 18 }}
                  >
                    {r.icon}
                    <span className="flex-1 truncate text-[14.5px]">{r.name}</span>
                    {sameScope(r.scope, config.scope) && <Check size={17} className="text-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Group>

        {mode === 'exam' ? (
          <>
            <Chips title="Anzahl Fragen" options={EXAM_COUNTS.map((n) => ({ label: `${n}`, value: n }))} value={config.limit} onChange={(limit) => set({ limit })} />
            <Chips title="Zeit (Minuten)" options={EXAM_MINUTES.map((n) => ({ label: `${n}`, value: n }))} value={config.examMinutes} onChange={(m) => set({ examMinutes: m ?? 30 })} />
          </>
        ) : (
          mode !== 'srs' && (
            <>
              <Chips title="Anzahl Karten" options={LIMITS} value={config.limit} onChange={(limit) => set({ limit })} />
              <div>
                <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">Reihenfolge</p>
                <Segmented
                  ariaLabel="Reihenfolge"
                  value={config.order}
                  options={[
                    { value: 'random', label: 'Zufällig' },
                    { value: 'ordered', label: 'Wie angelegt' },
                  ]}
                  onChange={(order) => set({ order })}
                />
              </div>
              <div>
                <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">Abfragerichtung</p>
                <Segmented
                  ariaLabel="Abfragerichtung"
                  value={config.direction}
                  options={[
                    { value: 'front', label: 'Vorne → Hinten' },
                    { value: 'back', label: 'Hinten → Vorne' },
                    { value: 'both', label: 'Beides' },
                  ]}
                  onChange={(direction) => set({ direction })}
                />
              </div>
            </>
          )
        )}

        <Group title="Nur bestimmte Karten">
          <div className="divide-y divide-line">
            <Switch label="Nur markierte" checked={config.flaggedOnly} onChange={(flaggedOnly) => set({ flaggedOnly })} />
            <Switch label="Nur schwierige" description="Oft vergessen oder als schwer bewertet" checked={config.difficultOnly} onChange={(difficultOnly) => set({ difficultOnly })} />
            <Switch label="Nur neue" checked={config.newOnly} onChange={(newOnly) => set({ newOnly })} />
          </div>
        </Group>

        {tags.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">Schlagwörter</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const active = config.tags.includes(t)
                return (
                  <button
                    key={t}
                    onClick={() => set({ tags: active ? config.tags.filter((x) => x !== t) : [...config.tags, t] })}
                    className={`h-9 rounded-full px-3 text-[13.5px] font-medium transition-colors ${active ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'}`}
                  >
                    #{t}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">{title}</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </div>
  )
}

function Chips<T extends number | null>({ title, options, value, onChange }: { title: string; options: { label: string; value: T }[]; value: T | number | null; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">{title}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onChange(o.value)}
            className={`h-10 flex-1 rounded-xl text-[14.5px] font-semibold transition-colors ${o.value === value ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
