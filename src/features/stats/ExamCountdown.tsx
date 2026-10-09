import { CalendarClock, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Pressable } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import { examPlan } from './compute'

/** Prüfungs-Countdown mit Tagesempfehlung. Ohne Datum: Aufforderung, eins festzulegen. */
export function ExamCountdown({ newCount }: { newCount: number }) {
  const { examDate, examName, dailyNewLimit, update } = useSettings()
  const [open, setOpen] = useState(false)
  const plan = examDate ? examPlan(examDate, newCount) : null

  return (
    <>
      <Pressable onClick={() => setOpen(true)} className="block w-full text-left">
        {plan && plan.daysLeft >= 0 ? (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl accent-gradient text-white shadow-[0_8px_20px_-10px_var(--accent)]">
                <span className="text-[24px] font-extrabold leading-none tabular-nums">{plan.daysLeft}</span>
                <span className="text-[10.5px] font-semibold opacity-90">{plan.daysLeft === 1 ? 'Tag' : 'Tage'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{plan.daysLeft === 0 ? `Heute: ${examName}! Viel Erfolg 🍀` : `bis zur ${examName}`}</p>
                <p className="text-[13px] leading-snug text-ink-2">
                  {newCount === 0
                    ? 'Alle Karten sind schon gelernt – jetzt heißt es wiederholen.'
                    : newCount === 1
                      ? 'Nur noch 1 neue Karte – lern sie heute, dann bleibt alles fürs Wiederholen.'
                      : `Lerne täglich ca. ${plan.newPerDay} neue ${plan.newPerDay === 1 ? 'Karte' : 'Karten'}, dann schaffst du alle ${newCount}${plan.bufferDays ? ` mit ${plan.bufferDays} ${plan.bufferDays === 1 ? 'Tag' : 'Tagen'} Puffer` : ''}.`}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-3" />
            </div>
            {plan.newPerDay > dailyNewLimit && (
              <p className="border-t border-line bg-warning/10 px-4 py-2 text-[12.5px] text-ink-2">
                ⚠️ Dein Tageslimit ({dailyNewLimit} neue) ist zu niedrig – tippe hier, um es anzupassen.
              </p>
            )}
          </Card>
        ) : (
          <Card className="flex items-center gap-4 p-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <CalendarClock size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{plan ? 'Prüfung vorbei – neues Datum?' : 'Prüfungs-Countdown'}</p>
              <p className="text-[13px] text-ink-2">Prüfungsdatum festlegen und Lernplan erhalten</p>
            </div>
            <ChevronRight size={18} className="text-ink-3" />
          </Card>
        )}
      </Pressable>

      <ExamSheet open={open} onClose={() => setOpen(false)} newCount={newCount} onSave={(p) => update(p)} current={{ examDate, examName, dailyNewLimit }} />
    </>
  )
}

interface ExamSheetProps {
  open: boolean
  onClose: () => void
  newCount: number
  current: { examDate: string | null; examName: string; dailyNewLimit: number }
  onSave: (patch: { examDate?: string | null; examName?: string; dailyNewLimit?: number }) => void
}

function ExamSheet({ open, onClose, newCount, current, onSave }: ExamSheetProps) {
  const [date, setDate] = useState(current.examDate ?? '')
  const [name, setName] = useState(current.examName)
  useEffect(() => {
    if (!open) return
    setDate(current.examDate ?? '')
    setName(current.examName)
  }, [open, current.examDate, current.examName])
  const plan = date ? examPlan(date, newCount) : null
  const today = new Date().toISOString().slice(0, 10)

  const save = (adoptLimit: boolean) => {
    onSave({
      examDate: date || null,
      examName: name.trim() || 'Prüfung',
      ...(adoptLimit && plan ? { dailyNewLimit: Math.max(current.dailyNewLimit, plan.newPerDay) } : {}),
    })
    toast(date ? 'Prüfungsdatum gespeichert' : 'Countdown entfernt', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Prüfungs-Countdown"
      footer={
        <div className="space-y-2">
          {plan && plan.newPerDay > current.dailyNewLimit && (
            <Button block onClick={() => save(true)}>
              Speichern & Tageslimit auf {plan.newPerDay} setzen
            </Button>
          )}
          <Button block variant={plan && plan.newPerDay > current.dailyNewLimit ? 'secondary' : 'primary'} onClick={() => save(false)}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-ink-2">Name der Prüfung</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-semibold text-ink-2">Datum</span>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        {plan && plan.daysLeft > 0 && (
          <div className="rounded-2xl bg-accent-soft px-4 py-3 text-[14px] leading-relaxed">
            Noch <b>{plan.daysLeft} Tage</b>. Du hast <b>{newCount}</b> {newCount === 1 ? 'neue Karte' : 'neue Karten'} – das sind etwa <b>{plan.newPerDay} pro Tag</b>
            {plan.bufferDays > 0 && `, plus ${plan.bufferDays} ${plan.bufferDays === 1 ? 'Tag' : 'Tage'} zum Wiederholen vor der Prüfung`}.
          </div>
        )}
        {current.examDate && (
          <button onClick={() => setDate('')} className="w-full py-2 text-center text-[14px] font-medium text-danger">
            Countdown entfernen
          </button>
        )}
      </div>
    </Sheet>
  )
}
