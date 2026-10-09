import { motion } from 'framer-motion'
import { CalendarClock, Flame, FolderPlus, Play, Sparkles, Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Pressable } from '@/components/Pressable'
import { ProgressRing } from '@/components/ProgressRing'

function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
}

export function HomePage() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  // Platzhalterwerte – werden in Meilenstein 4/5 mit echten Daten verbunden
  const due = 0
  const doneToday = 0
  const streak = 0
  const minutes = 0

  return (
    <>
      <PageHeader title={greeting()} subtitle={today} />

      <motion.div variants={list} initial="hidden" animate="show" className="space-y-4 px-5">
        <motion.section variants={item}>
          <div className="relative overflow-hidden rounded-[28px] accent-gradient p-5 text-white shadow-lift">
            <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-16 right-16 size-32 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-5">
              <ProgressRing value={due === 0 ? 0 : doneToday / (doneToday + due)} size={92} stroke={9}>
                <span className="text-2xl font-bold leading-none">{due}</span>
                <span className="mt-0.5 text-[11px] font-medium opacity-80">fällig</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium opacity-80">Heute</p>
                <p className="mb-3 text-lg font-semibold leading-snug">
                  {due === 0 ? 'Alles erledigt – leg neue Karten an.' : `${due} Karten warten auf dich`}
                </p>
                <Pressable
                  onClick={() => navigate('/lernen')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-accent shadow-soft"
                >
                  <Play size={15} fill="currentColor" /> Jetzt lernen
                </Pressable>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={item} className="grid grid-cols-3 gap-3">
          <StatTile icon={Flame} label="Streak" value={`${streak}`} unit="Tage" tint="text-warning" />
          <StatTile icon={Timer} label="Lernzeit" value={`${minutes}`} unit="Min." tint="text-accent" />
          <StatTile icon={Sparkles} label="Gelernt" value={`${doneToday}`} unit="Karten" tint="text-success" />
        </motion.section>

        <motion.section variants={item}>
          <Pressable onClick={() => navigate('/einstellungen')} className="block w-full text-left">
            <Card className="flex items-center gap-4 p-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <CalendarClock size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Prüfungs-Countdown</p>
                <p className="text-[13px] text-ink-2">Prüfungsdatum festlegen und Lernplan erhalten</p>
              </div>
            </Card>
          </Pressable>
        </motion.section>

        <motion.section variants={item}>
          <Pressable onClick={() => navigate('/ordner')} className="block w-full text-left">
            <Card className="flex items-center gap-4 p-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <FolderPlus size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Ordner & Karten</p>
                <p className="text-[13px] text-ink-2">Lege deinen ersten Ordner an</p>
              </div>
            </Card>
          </Pressable>
        </motion.section>
      </motion.div>
    </>
  )
}

interface StatTileProps {
  icon: typeof Flame
  label: string
  value: string
  unit: string
  tint: string
}

function StatTile({ icon: Icon, label, value, unit, tint }: StatTileProps) {
  return (
    <Card className="p-3.5">
      <Icon size={18} className={`mb-2 ${tint}`} />
      <p className="text-[22px] font-bold leading-none tracking-tight">
        {value} <span className="text-[12px] font-medium text-ink-3">{unit}</span>
      </p>
      <p className="mt-1 text-[12px] text-ink-2">{label}</p>
    </Card>
  )
}
