import { useCallback, useEffect, useRef, useState } from 'react'

// Minimale Typen der Web Speech API (in Safari als webkitSpeechRecognition verfügbar)
interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionResult {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}
interface SpeechRecognitionEvent {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRecognitionResult }
}
interface SpeechRecognitionErrorEvent {
  error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognition(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const speechSupported = () => typeof window !== 'undefined' && Boolean(getRecognition())

const ERRORS: Record<string, string> = {
  'not-allowed': 'Mikrofon-Zugriff wurde verweigert. Erlaube ihn in den iPhone-Einstellungen (Safari → Mikrofon).',
  'service-not-allowed': 'Spracherkennung ist nicht erlaubt. Prüfe Einstellungen → Allgemein → Tastatur → Diktierfunktion.',
  'no-speech': 'Ich habe nichts gehört – tippe nochmal auf das Mikrofon.',
  'audio-capture': 'Kein Mikrofon gefunden.',
  network: 'Für die Spracherkennung wird eine Internetverbindung benötigt.',
}

interface Options {
  /** Wird mit dem fertigen Text aufgerufen, sobald eine Aufnahme endet */
  onFinal?: (text: string) => void
}

/** Spracherkennung (Deutsch). Eine Aufnahme endet automatisch nach einer Sprechpause. */
export function useSpeech({ onFinal }: Options = {}) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const stop = useCallback(() => recRef.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = getRecognition()
    if (!Ctor) {
      setError('Spracherkennung wird hier nicht unterstützt. Nutze das Mikrofon auf deiner Tastatur.')
      return
    }
    recRef.current?.abort()
    const rec = new Ctor()
    rec.lang = 'de-DE'
    rec.continuous = false
    rec.interimResults = true
    finalRef.current = ''
    setInterim('')
    setError(null)

    rec.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!
        if (r.isFinal) finalRef.current += r[0].transcript
        else interimText += r[0].transcript
      }
      setInterim((finalRef.current + interimText).trim())
    }
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? `Spracherkennung fehlgeschlagen (${e.error}).`)
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      const text = finalRef.current.trim()
      if (text) onFinalRef.current?.(text)
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Die Aufnahme konnte nicht gestartet werden.')
    }
  }, [])

  useEffect(() => () => recRef.current?.abort(), [])

  return { supported: speechSupported(), listening, interim, error, start, stop }
}

const QUESTION_WORDS = /^(was|wie|wer|wen|wem|wessen|wo|woher|wohin|warum|wieso|weshalb|wann|welche[rsmn]?|wozu|wodurch|womit|worin|wofür|inwiefern)\b/i

/** Macht aus erkanntem Text einen sauberen Satz (Großschreibung, Fragezeichen bei W-Fragen). */
export function tidyTranscript(text: string, kind: 'question' | 'answer'): string {
  let t = text.trim().replace(/\s+/g, ' ')
  if (!t) return t
  t = t[0]!.toUpperCase() + t.slice(1)
  if (kind === 'question' && QUESTION_WORDS.test(t) && !/[?.!:]$/.test(t)) t += '?'
  return t
}

/**
 * Teilt einen gesprochenen Satz an „Antwort“ auf, z. B.
 * „Was ist ein Router Antwort verbindet Netzwerke“ → Frage + Antwort.
 */
export function splitQuestionAnswer(text: string): { question: string; answer: string } | null {
  const m = /^(.*?)\s+(?:antwort|lösung|rückseite)\s*[:,.]?\s+(.+)$/i.exec(text.trim())
  if (!m || !m[1]!.trim() || !m[2]!.trim()) return null
  return { question: tidyTranscript(m[1]!, 'question'), answer: tidyTranscript(m[2]!, 'answer') }
}
