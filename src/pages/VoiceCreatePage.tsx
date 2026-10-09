import { AnimatePresence, motion } from 'framer-motion'
import { Check, Mic, MicOff, RotateCcw, SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { db } from '@/db/db'
import type { Deck } from '@/db/types'
import { emptyDraft } from '@/features/cards/model'
import { createCard } from '@/features/cards/repo'
import { textToDoc } from '@/features/cards/richtext'
import { ItemIcon } from '@/features/library/ItemIcon'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { splitQuestionAnswer, tidyTranscript, useSpeech } from '@/features/voice/useSpeech'
import { toast } from '@/store/toast'

type Step = 'question' | 'answer'

export function VoiceCreatePage() {
  const { deckId = '' } = useParams()
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined)

  useEffect(() => {
    void db.decks.get(deckId).then((d) => setDeck(d && !d.deletedAt ? d : null))
  }, [deckId])

  if (deck === null) return <Navigate to="/ordner" replace />
  if (!deck) return <LibrarySkeleton />
  return <VoiceCreator deck={deck} />
}

function VoiceCreator({ deck }: { deck: Deck }) {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState<Step>('question')
  const [saved, setSaved] = useState(0)
  const [busy, setBusy] = useState(false)
  const stepRef = useRef(step)
  stepRef.current = step

  const speech = useSpeech({
    onFinal: (text) => {
      if (stepRef.current === 'question') {
        // „… Antwort …“ in einem Satz → beide Felder auf einmal
        const split = splitQuestionAnswer(text)
        if (split) {
          setQuestion(split.question)
          setAnswer(split.answer)
        } else {
          setQuestion(tidyTranscript(text, 'question'))
          setStep('answer')
        }
      } else {
        setAnswer(tidyTranscript(text, 'answer'))
      }
    },
  })

  const ready = question.trim() && answer.trim()
  const live = speech.listening ? speech.interim : ''

  const listen = (target: Step) => {
    setStep(target)
    speech.start()
  }

  const save = async (next: boolean) => {
    if (!ready || busy) return
    setBusy(true)
    try {
      await createCard(deck.id, { ...emptyDraft('basic'), front: textToDoc(question.trim()), back: textToDoc(answer.trim()) })
      setSaved((n) => n + 1)
      setQuestion('')
      setAnswer('')
      setStep('question')
      if (next) {
        toast('Karte gespeichert – sprich die nächste Frage', { tone: 'success' })
        // Direkt weiter zuhören (der Tipp auf den Button erlaubt den Mikrofonstart)
        speech.start()
      } else {
        toast(saved > 0 ? `${saved + 1} Karten gespeichert` : 'Karte gespeichert', { tone: 'success' })
        navigate(`/stapel/${deck.id}`, { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  const prompt = speech.listening
    ? step === 'question'
      ? 'Ich höre zu … sprich die Frage'
      : 'Ich höre zu … sprich die Antwort'
    : ready
      ? 'Passt alles? Dann speichern.'
      : step === 'question'
        ? 'Tippe aufs Mikrofon und sprich die Frage'
        : 'Jetzt die Antwort – tippe aufs Mikrofon'

  return (
    <div className="flex min-h-full flex-col">
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="flex h-14 items-center justify-between px-3">
          <button onClick={() => navigate(`/stapel/${deck.id}`, { replace: true })} className="min-h-11 px-2 text-[16px] text-accent">
            {saved > 0 ? 'Fertig' : 'Abbrechen'}
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[16px] font-semibold">Per Sprache</p>
            <p className="flex items-center justify-center gap-1 truncate text-[12px] text-ink-3">
              <ItemIcon icon={deck.icon} color={deck.color} size={14} /> {deck.name}
              {saved > 0 && <span className="ml-1 font-semibold text-success">· {saved} gespeichert</span>}
            </p>
          </div>
          <span className="w-[72px]" />
        </div>
      </header>

      <div className="flex-1 space-y-3 px-5 pt-4">
        <VoiceField
          label="Frage"
          value={step === 'question' && live ? live : question}
          active={step === 'question'}
          listening={speech.listening && step === 'question'}
          onChange={setQuestion}
          onMic={() => listen('question')}
          placeholder="z. B. Was macht ein Router?"
        />
        <VoiceField
          label="Antwort"
          value={step === 'answer' && live ? live : answer}
          active={step === 'answer'}
          listening={speech.listening && step === 'answer'}
          onChange={setAnswer}
          onMic={() => listen('answer')}
          placeholder="z. B. Verbindet Netzwerke und leitet Pakete weiter"
        />

        {speech.error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{speech.error}</p>}

        {!speech.supported ? (
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
            Die direkte Spracherkennung ist hier nicht verfügbar. Tippe in ein Feld und nutze das 🎤 Mikrofon auf deiner Tastatur – das funktioniert genauso schnell.
          </p>
        ) : (
          <p className="px-1 text-[13px] leading-relaxed text-ink-3">
            💡 Profi-Tipp: Sag alles in einem Satz, z. B. <i>„Was macht ein Router – Antwort – verbindet Netzwerke“</i>. Bei W-Fragen setzt Karteio das Fragezeichen automatisch.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 px-5 pb-[calc(var(--safe-bottom)+16px)] pt-4">
        <p className="mb-4 text-center text-[15px] font-medium text-ink-2" aria-live="polite">
          {prompt}
        </p>
        {speech.supported && (
          <div className="mb-5 flex justify-center">
            <MicButton listening={speech.listening} onClick={() => (speech.listening ? speech.stop() : listen(step))} />
          </div>
        )}
        <div className="flex gap-2.5">
          {(question || answer) && (
            <Button
              variant="secondary"
              aria-label="Neu beginnen"
              onClick={() => {
                setQuestion('')
                setAnswer('')
                setStep('question')
              }}
            >
              <RotateCcw size={18} />
            </Button>
          )}
          <Button variant="secondary" className="flex-1" disabled={!ready || busy} onClick={() => void save(false)}>
            <Check size={18} /> Fertig
          </Button>
          <Button className="flex-[2] whitespace-nowrap px-3" disabled={!ready || busy} onClick={() => void save(true)}>
            <SkipForward size={18} /> Speichern & nächste
          </Button>
        </div>
      </div>
    </div>
  )
}

interface VoiceFieldProps {
  label: string
  value: string
  active: boolean
  listening: boolean
  placeholder: string
  onChange: (v: string) => void
  onMic: () => void
}

function VoiceField({ label, value, active, listening, placeholder, onChange, onMic }: VoiceFieldProps) {
  return (
    <motion.div
      animate={{ scale: active ? 1 : 0.98, opacity: active || value ? 1 : 0.7 }}
      className={`rounded-2xl border bg-surface p-3 shadow-soft transition-colors ${listening ? 'border-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-line'}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
        <button onClick={onMic} aria-label={`${label} sprechen`} className={`flex size-9 items-center justify-center rounded-full ${listening ? 'bg-accent text-white' : 'text-accent active:bg-surface-2'}`}>
          <Mic size={18} />
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={listening}
        rows={2}
        placeholder={placeholder}
        className={`w-full resize-none bg-transparent px-1 text-[17px] leading-snug outline-none placeholder:text-ink-3 ${listening ? 'text-ink-2' : 'text-ink'}`}
      />
    </motion.div>
  )
}

function MicButton({ listening, onClick }: { listening: boolean; onClick: () => void }) {
  return (
    <div className="relative flex size-24 items-center justify-center">
      <AnimatePresence>
        {listening &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full bg-accent"
              initial={{ scale: 0.8, opacity: 0.35 }}
              animate={{ scale: 1.9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
            />
          ))}
      </AnimatePresence>
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        animate={{ scale: listening ? 1.06 : 1 }}
        aria-label={listening ? 'Aufnahme beenden' : 'Sprechen'}
        className="relative flex size-24 items-center justify-center rounded-full accent-gradient text-white shadow-[0_16px_36px_-12px_var(--accent)]"
      >
        {listening ? <MicOff size={34} /> : <Mic size={36} />}
      </motion.button>
    </div>
  )
}
