import { motion } from 'framer-motion'
import { Brain, CheckSquare, GraduationCap, Keyboard, Play, Shuffle, Timer, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Pressable } from '@/components/Pressable'
import { Button } from '@/components/Button'
import type { StudyMode } from '@/db/types'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { useLibrary } from '@/features/library/useLibrary'
import { StudySetupSheet } from '@/features/study/ui/StudySetupSheet'
import { DEFAULT_CONFIG, MODE_INFO, type StudyConfig } from '@/features/study/types'
import { startSession } from '@/features/study/session'
import { toast } from '@/store/toast'

const MODES: { mode: StudyMode; icon: LucideIcon; tint: string }[] = [
  { mode: 'srs', icon: Brain, tint: 'accent-gradient' },
  { mode: 'free', icon: Shuffle, tint: 'bg-gradient-to-br from-sky-500 to-blue-600' },
  { mode: 'write', icon: Keyboard, tint: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
  { mode: 'quiz', icon: CheckSquare, tint: 'bg-gradient-to-br from-amber-500 to-orange-600' },
  { mode: 'exam', icon: Timer, tint: 'bg-gradient-to-br from-rose-500 to-pink-600' },
]

export function LearnPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  const [setup, setSetup] = useState<StudyConfig | null>(null)

  if (!library) return <LibrarySkeleton />
  const total = library.totalStats()

  if (total.total === 0) {
    return (
      <>
        <PageHeader title="Lernen" />
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Karten"
          text="Lege zuerst einen Stapel mit Karten an – dann kannst du hier loslegen."
          action={<Button onClick={() => navigate('/ordner')}>Zu den Ordnern</Button>}
        />
      </>
    )
  }

  const quickStart = async () => {
    const n = await startSession({ ...DEFAULT_CONFIG, mode: 'srs' })
    if (n === 0) toast('Für heute ist alles erledigt 🎉')
    else navigate('/lernen/sitzung')
  }

  const open = (mode: StudyMode) =>
    setSetup({
      ...DEFAULT_CONFIG,
      mode,
      limit: mode === 'exam' ? 20 : mode === 'srs' ? null : 20,
    })

  const todo = total.due + total.newCount

  return (
    <>
      <PageHeader title="Lernen" subtitle={`${total.total} Abfragen in ${library.decks.size} ${library.decks.size === 1 ? 'Stapel' : 'Stapeln'}`} />
      <div className="space-y-5 px-5">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] accent-gradient p-5 text-white shadow-lift">
          <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
          <p className="text-[13px] font-medium opacity-80">Heute</p>
          <p className="mb-1 text-[30px] font-bold leading-tight tracking-tight">
            {total.due} fällig <span className="text-[18px] font-semibold opacity-80">· {total.newCount} neu</span>
          </p>
          <p className="mb-4 text-[14px] opacity-85">
            {todo === 0 ? 'Super, alles wiederholt! Du kannst trotzdem frei üben.' : 'Karteio hat deine Wiederholungen für heute vorbereitet.'}
          </p>
          <Pressable
            onClick={() => void (todo === 0 ? open('free') : quickStart())}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-accent shadow-soft"
          >
            <Play size={16} fill="currentColor" /> {todo === 0 ? 'Frei üben' : 'Jetzt lernen'}
          </Pressable>
        </motion.section>

        <section>
          <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-3">Lernmodi</h2>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(({ mode, icon: Icon, tint }, i) => (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 26 }}
                className={mode === 'srs' ? 'col-span-2' : ''}
              >
                <Pressable onClick={() => open(mode)} className="flex h-full w-full flex-col items-start gap-2.5 rounded-[22px] border border-line bg-surface p-4 text-left shadow-soft">
                  <span className={`flex size-11 items-center justify-center rounded-2xl text-white shadow-[0_6px_14px_-6px_rgb(0_0_0/0.4)] ${tint}`}>
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className="block text-[16px] font-semibold tracking-tight">{MODE_INFO[mode].label}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{MODE_INFO[mode].description}</span>
                  </span>
                </Pressable>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {setup && <StudySetupSheet open onClose={() => setSetup(null)} library={library} initial={setup} />}
    </>
  )
}
