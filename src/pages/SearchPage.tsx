import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, Flag, Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/db/db'
import type { Card, Id } from '@/db/types'
import { cardPreviewText } from '@/features/cards/CardRow'
import { TYPE_ICONS } from '@/features/cards/TypePicker'
import { DeckPickerSheet } from '@/features/library/DeckPickerSheet'
import { ItemIcon } from '@/features/library/ItemIcon'
import { useLibrary } from '@/features/library/useLibrary'

type StatusFilter = 'flagged' | 'suspended' | 'new'

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/** Hebt Fundstellen hervor */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const i = norm(text).indexOf(norm(query))
  if (i < 0) return <>{text}</>
  // Kontext um die Fundstelle, damit sie in langen Texten sichtbar ist
  const start = Math.max(0, i - 40)
  return (
    <>
      {start > 0 && '…'}
      {text.slice(start, i)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

export function SearchPage() {
  const navigate = useNavigate()
  const library = useLibrary()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim())
  const [status, setStatus] = useState<Set<StatusFilter>>(new Set())
  const [tags, setTags] = useState<Set<string>>(new Set())
  const [deckId, setDeckId] = useState<Id | null>(null)
  const [deckPicker, setDeckPicker] = useState(false)

  const data = useLiveQuery(async () => {
    const [cards, newStates] = await Promise.all([db.cards.filter((c) => !c.deletedAt).toArray(), db.cardStates.where('state').equals(0).toArray()])
    return { cards, newIds: new Set(newStates.map((s) => s.cardId)) }
  })

  // Suchindex: Text je Karte einmal vorbereiten
  const index = useMemo(
    () =>
      (data?.cards ?? []).map((c) => {
        const { front, back } = cardPreviewText(c)
        return { card: c, front, back, haystack: norm(`${front} ${back} ${c.tags.join(' ')} ${c.notes ?? ''} ${c.hint ?? ''}`) }
      }),
    [data],
  )
  const allTags = useMemo(() => [...new Set(index.flatMap((i) => i.card.tags))].sort((a, b) => a.localeCompare(b, 'de')), [index])

  const filtersActive = status.size > 0 || tags.size > 0 || deckId !== null
  const q = norm(deferred)
  const results = useMemo(() => {
    if (!q && !filtersActive) return []
    return index.filter(({ card, haystack }) => {
      if (library && !library.decks.has(card.deckId)) return false
      if (q && !haystack.includes(q)) return false
      if (deckId && card.deckId !== deckId) return false
      if (status.has('flagged') && !card.flagged) return false
      if (status.has('suspended') && !card.suspended) return false
      if (status.has('new') && !data?.newIds.has(card.id)) return false
      if (tags.size && !card.tags.some((t) => tags.has(t))) return false
      return true
    })
  }, [index, q, filtersActive, deckId, status, tags, data, library])

  const matchingItems = useMemo(() => {
    if (!q || !library) return []
    return [
      ...[...library.folders.values()].filter((f) => norm(f.name).includes(q)).map((f) => ({ kind: 'folder' as const, id: f.id, name: f.name, icon: f.icon, color: f.color })),
      ...[...library.decks.values()].filter((d) => norm(d.name).includes(q)).map((d) => ({ kind: 'deck' as const, id: d.id, name: d.name, icon: d.icon, color: d.color })),
    ].slice(0, 6)
  }, [q, library])

  const toggle = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    apply(next)
  }

  const pathOf = (card: Card) => {
    const deck = library?.decks.get(card.deckId)
    if (!deck || !library) return ''
    return [...library.path(deck.folderId).map((f) => f.name), deck.name].join(' › ')
  }

  return (
    <>
      <header className="glass sticky top-0 z-20 px-3 pb-3 pt-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} aria-label="Zurück" className="flex size-11 shrink-0 items-center justify-center text-accent">
            <ChevronLeft size={24} />
          </button>
          <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-transparent bg-surface-2 px-3.5 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
            <Search size={18} className="shrink-0 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Alle Karten durchsuchen"
              aria-label="Suchbegriff"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Suche leeren" className="text-ink-3">
                <X size={17} />
              </button>
            )}
          </label>
        </div>
        <div className="scroll-area mt-2.5 flex gap-1.5 overflow-x-auto px-1">
          <Chip active={deckId !== null} onClick={() => (deckId ? setDeckId(null) : setDeckPicker(true))}>
            {deckId ? (library?.decks.get(deckId)?.name ?? 'Stapel') : 'Stapel'} {deckId ? <X size={13} /> : <ChevronDown size={13} />}
          </Chip>
          <Chip active={status.has('flagged')} onClick={() => toggle(status, 'flagged', setStatus)}>
            <Flag size={13} /> Markiert
          </Chip>
          <Chip active={status.has('new')} onClick={() => toggle(status, 'new', setStatus)}>
            Neu
          </Chip>
          <Chip active={status.has('suspended')} onClick={() => toggle(status, 'suspended', setStatus)}>
            Ausgesetzt
          </Chip>
          {allTags.map((t) => (
            <Chip key={t} active={tags.has(t)} onClick={() => toggle(tags, t, setTags)}>
              #{t}
            </Chip>
          ))}
        </div>
      </header>

      <div className="px-5 pt-3">
        {!q && !filtersActive ? (
          <div className="py-16 text-center">
            <Search size={40} className="mx-auto mb-3 text-ink-3" />
            <p className="text-[15px] text-ink-2">Suche nach Fragen, Antworten, Schlagwörtern oder Notizen – oder wähle oben einen Filter.</p>
          </div>
        ) : (
          <>
            {matchingItems.length > 0 && (
              <section className="mb-4">
                <h2 className="mb-2 px-1 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">Ordner & Stapel</h2>
                <div className="scroll-area -mx-5 flex gap-2 overflow-x-auto px-5">
                  {matchingItems.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => navigate(i.kind === 'folder' ? `/ordner/${i.id}` : `/stapel/${i.id}`)}
                      className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface py-2 pl-2 pr-3.5 shadow-soft"
                    >
                      <ItemIcon icon={i.icon} color={i.color} size={30} variant={i.kind} />
                      <span className="text-[14px] font-medium">{i.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <h2 className="mb-2 px-1 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">
              {results.length} {results.length === 1 ? 'Karte' : 'Karten'}
            </h2>
            {results.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-ink-2">Nichts gefunden.</p>
            ) : (
              <div className="space-y-2.5 pb-6">
                {results.slice(0, 200).map(({ card, front, back }, i) => {
                  const Icon = TYPE_ICONS[card.type]
                  return (
                    <motion.button
                      key={card.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 10) * 0.02 }}
                      onClick={() => navigate(`/karte/${card.id}/bearbeiten`, { state: { returnTo: '/suche' } })}
                      className="card-row flex w-full items-start gap-3 rounded-[20px] border border-line bg-surface p-3.5 text-left shadow-soft"
                    >
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-ink-3">{pathOf(card)}</span>
                        <span className="line-clamp-2 text-[15px] font-medium leading-snug">
                          <Highlight text={front} query={deferred} />
                        </span>
                        {back && (
                          <span className="mt-0.5 line-clamp-2 block text-[13.5px] text-ink-2">
                            <Highlight text={back} query={deferred} />
                          </span>
                        )}
                      </span>
                      {card.flagged && <Flag size={14} className="mt-1 shrink-0 fill-warning text-warning" />}
                    </motion.button>
                  )
                })}
                {results.length > 200 && <p className="py-2 text-center text-[13px] text-ink-3">Die ersten 200 Treffer – verfeinere die Suche.</p>}
              </div>
            )}
          </>
        )}
      </div>

      {library && <DeckPickerSheet open={deckPicker} onClose={() => setDeckPicker(false)} library={library} title="Stapel wählen" onPick={setDeckId} />}
    </>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors ${active ? 'bg-accent text-white' : 'bg-surface text-ink-2 shadow-soft'}`}
    >
      {children}
    </button>
  )
}
