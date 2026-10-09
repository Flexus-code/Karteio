import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Printer } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { db } from '@/db/db'
import { CardFace } from '@/features/cards/CardFace'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'

/** Druckansicht eines Stapels (iOS: Teilen → Drucken → „Als PDF sichern“) */
export function PrintPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const deck = await db.decks.get(deckId)
    const cards = (await db.cards.where('deckId').equals(deckId).toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.createdAt - b.createdAt)
    return { deck, cards }
  }, [deckId])

  if (!data) return <LibrarySkeleton />

  return (
    <div className="print-page min-h-full bg-white px-5 pb-10 pt-2 text-[#111]">
      <div className="no-print mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="-ml-2 flex min-h-11 items-center gap-0.5 pr-2 text-[16px] font-medium text-accent">
          <ChevronLeft size={24} /> Zurück
        </button>
        <Button onClick={() => window.print()}>
          <Printer size={18} /> Drucken / PDF
        </Button>
      </div>
      <h1 className="text-[24px] font-bold">{data.deck?.name}</h1>
      <p className="mb-5 text-[13px] text-[#555]">
        {data.cards.length} Karten · erstellt mit Karteio · {new Date().toLocaleDateString('de-DE')}
      </p>
      <ol className="space-y-3">
        {data.cards.map((c, i) => (
          <li key={c.id} className="print-card grid grid-cols-2 gap-4 rounded-xl border border-[#ddd] p-3 text-[14px]">
            <div>
              <span className="text-[11px] font-semibold text-[#888]">{i + 1}.</span>
              <CardFace card={c} side="front" variant={{ cloze: null }} hideLabel />
            </div>
            <div className="border-l border-[#eee] pl-4">
              <CardFace card={c} side="back" variant={{ cloze: null }} hideLabel />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
