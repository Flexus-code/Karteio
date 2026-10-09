import { motion } from 'framer-motion'
import { BookOpen, Check, ChevronRight, HardDrive, Info, Palette, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { formatBytes, getStorageEstimate } from '@/lib/storage'
import { ACCENTS, useUiStore, type ThemeMode } from '@/store/ui'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

export function SettingsPage() {
  const { theme, accent, setTheme, setAccent, setOnboardingDone } = useUiStore()
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void getStorageEstimate().then(setStorage)
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  return (
    <>
      <PageHeader title="Einstellungen" />
      <div className="space-y-6 px-5">
        <Section icon={Palette} title="Darstellung">
          <Card className="space-y-5 p-4">
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Erscheinungsbild</p>
              <Segmented ariaLabel="Erscheinungsbild" value={theme} options={THEME_OPTIONS} onChange={setTheme} />
            </div>
            <div>
              <p className="mb-3 text-[13px] font-medium text-ink-2">Akzentfarbe</p>
              <div role="radiogroup" aria-label="Akzentfarbe" className="flex justify-between">
                {ACCENTS.map((a) => {
                  const active = a.id === accent
                  return (
                    <motion.button
                      key={a.id}
                      role="radio"
                      aria-checked={active}
                      aria-label={a.label}
                      onClick={() => setAccent(a.id)}
                      whileTap={{ scale: 0.88 }}
                      className="relative flex size-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: a.color }}
                    >
                      {active && (
                        <motion.span
                          layoutId="accent-ring"
                          className="absolute -inset-1 rounded-full border-2"
                          style={{ borderColor: a.color }}
                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        />
                      )}
                      {active && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check size={18} strokeWidth={3} className="text-white" />
                        </motion.span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </Card>
        </Section>

        <Section icon={HardDrive} title="Speicher">
          <Card className="divide-y divide-line">
            <Row label="Belegt">{storage ? formatBytes(storage.usage) : '–'}</Row>
            <Row label="Dauerhafte Speicherung">
              <span className={`inline-flex items-center gap-1 ${persisted ? 'text-success' : 'text-ink-2'}`}>
                {persisted && <ShieldCheck size={15} />}
                {persisted === null ? '–' : persisted ? 'Aktiv' : 'Nicht gewährt'}
              </span>
            </Row>
          </Card>
          <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink-3">
            Deine Karten werden nur auf diesem Gerät gespeichert. Backups folgen in einem späteren Schritt.
          </p>
        </Section>

        <Section icon={Info} title="Über">
          <Card className="divide-y divide-line">
            <button onClick={() => setOnboardingDone(false)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px] active:bg-surface-2">
              <BookOpen size={18} className="text-accent" />
              <span className="flex-1">Kurzanleitung anzeigen</span>
              <ChevronRight size={18} className="text-ink-3" />
            </button>
            <Row label="Version">{__APP_VERSION__}</Row>
            <Row label="Entwickelt von">Felix Böse</Row>
            <Row label="Daten">Lokal, offline</Row>
          </Card>
        </Section>
      </div>
    </>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
        <Icon size={14} /> {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between px-4 text-[15px]">
      <span>{label}</span>
      <span className="text-ink-2">{children}</span>
    </div>
  )
}
