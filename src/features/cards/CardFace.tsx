import { CheckCircle2, Circle, Lightbulb } from 'lucide-react'
import type { Choice, RichText } from '@/db/types'
import { renderClozeDoc } from './cloze'
import { RichTextView } from './editor/RichTextView'
import type { CardDraft } from './model'
import { isDocEmpty } from './richtext'

export interface FaceVariant {
  reverse?: boolean
  /** Abgefragte Lücke; `null` = alle Lücken */
  cloze?: number | null
}

interface CardFaceProps {
  card: Pick<CardDraft, 'type' | 'front' | 'back'> & { choices?: Choice[]; notes?: string }
  side: 'front' | 'back'
  variant?: FaceVariant
  /** Antwortmöglichkeiten nicht anzeigen (werden z. B. im Quiz interaktiv dargestellt) */
  hideChoices?: boolean
  /** Überschrift „Frage“/„Antwort“ ausblenden */
  hideLabel?: boolean
}

/** Inhalt einer Kartenseite – für Vorschau und Lernmodus. */
export function CardFace({ card, side, variant = {}, hideChoices, hideLabel }: CardFaceProps) {
  const label = side === 'front' ? 'Frage' : 'Antwort'

  const body = (() => {
    switch (card.type) {
      case 'cloze': {
        const active = variant.cloze ?? null
        const text = renderClozeDoc(card.front, active, side === 'front' ? 'question' : 'answer')
        return (
          <>
            <RichTextView content={text} />
            {side === 'back' && !isDocEmpty(card.back) && <Extra doc={card.back} />}
          </>
        )
      }
      case 'choice':
        return (
          <>
            <RichTextView content={card.front} />
            {!hideChoices && <ChoiceList choices={card.choices ?? []} reveal={side === 'back'} />}
            {side === 'back' && !isDocEmpty(card.back) && <Extra doc={card.back} />}
          </>
        )
      default: {
        // Standard, umkehrbar, Eingabe – bei umgekehrter Richtung werden die Seiten getauscht
        const show = (side === 'front') !== Boolean(variant.reverse) ? card.front : card.back
        return <RichTextView content={show} />
      }
    }
  })()

  return (
    <div className="flex flex-col gap-3">
      {!hideLabel && <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>}
      {body}
      {side === 'back' && card.notes && (
        <div className="mt-1 flex gap-2 rounded-2xl bg-warning/12 px-3 py-2.5 text-[14px] leading-snug">
          <Lightbulb size={17} className="mt-0.5 shrink-0 text-warning" />
          <span>{card.notes}</span>
        </div>
      )}
    </div>
  )
}

function Extra({ doc }: { doc: RichText }) {
  return (
    <div className="border-t border-line pt-3 text-ink-2">
      <RichTextView content={doc} />
    </div>
  )
}

function ChoiceList({ choices, reveal }: { choices: Choice[]; reveal: boolean }) {
  const filled = choices.filter((c) => c.text.trim())
  return (
    <ul className="space-y-2">
      {filled.map((c) => {
        const highlight = reveal && c.correct
        const Icon = highlight ? CheckCircle2 : Circle
        return (
          <li
            key={c.id}
            className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-[15px] transition-colors ${highlight ? 'border-success/40 bg-success/10' : 'border-line bg-surface-2/50'} ${reveal && !c.correct ? 'opacity-55' : ''}`}
          >
            <Icon size={19} className={`mt-px shrink-0 ${highlight ? 'text-success' : 'text-ink-3'}`} />
            <span>{c.text}</span>
          </li>
        )
      })}
    </ul>
  )
}
