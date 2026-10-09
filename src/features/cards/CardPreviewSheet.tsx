import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { CardFace } from './CardFace'
import { clozeNumbers } from './cloze'
import { FlipCard } from './FlipCard'
import type { CardDraft } from './model'
import { docToText } from './richtext'

interface CardPreviewSheetProps {
  open: boolean
  onClose: () => void
  draft: CardDraft
}

export function CardPreviewSheet({ open, onClose, draft }: CardPreviewSheetProps) {
  const [flipped, setFlipped] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [cloze, setCloze] = useState(1)
  const gaps = draft.type === 'cloze' ? clozeNumbers(docToText(draft.front)) : []
  const activeGap = gaps.includes(cloze) ? cloze : (gaps[0] ?? null)

  const chip = (active: boolean) =>
    `h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${active ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'}`

  return (
    <Sheet open={open} onClose={onClose} title="Vorschau">
      <div className="space-y-4 pb-2 pt-1">
        {draft.type === 'reversible' && (
          <div className="flex justify-center gap-2">
            <button className={chip(!reverse)} onClick={() => (setReverse(false), setFlipped(false))}>
              Vorne → Hinten
            </button>
            <button className={chip(reverse)} onClick={() => (setReverse(true), setFlipped(false))}>
              Hinten → Vorne
            </button>
          </div>
        )}
        {gaps.length > 1 && (
          <div className="scroll-area flex justify-center gap-2 overflow-x-auto">
            {gaps.map((n) => (
              <button key={n} className={chip(n === activeGap)} onClick={() => (setCloze(n), setFlipped(false))}>
                Lücke {n}
              </button>
            ))}
          </div>
        )}

        <FlipCard
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          front={<CardFace card={draft} side="front" variant={{ reverse, cloze: activeGap }} />}
          back={<CardFace card={draft} side="back" variant={{ reverse, cloze: activeGap }} />}
        />
        <p className="flex items-center justify-center gap-1.5 text-[13px] text-ink-3">
          <RotateCw size={14} /> Tippe auf die Karte, um sie umzudrehen
        </p>
        {draft.hint && (
          <p className="text-center text-[13px] text-ink-2">
            Hinweis beim Lernen: <span className="font-medium">{draft.hint}</span>
          </p>
        )}
      </div>
    </Sheet>
  )
}
