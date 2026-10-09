import { motion, useAnimationControls } from 'framer-motion'
import { ChevronDown, Eye, Save, SkipForward, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionSheet } from '@/components/ActionSheet'
import { Button } from '@/components/Button'
import { db } from '@/db/db'
import type { Card, Deck } from '@/db/types'
import { CardPreviewSheet } from '@/features/cards/CardPreviewSheet'
import { ChoicesEditor } from '@/features/cards/ChoicesEditor'
import { RichTextEditor } from '@/features/cards/editor/RichTextEditor'
import { draftFromCard, emptyDraft, validateDraft, type CardDraft } from '@/features/cards/model'
import { allTags, createCard, updateCard } from '@/features/cards/repo'
import { TagInput } from '@/features/cards/TagInput'
import { TypePicker } from '@/features/cards/TypePicker'
import { ItemIcon } from '@/features/library/ItemIcon'
import { LibrarySkeleton } from '@/features/library/LibrarySkeleton'
import { toast } from '@/store/toast'

const draftKey = (mode: 'new' | 'edit', id: string) => `karteio-draft:${mode}:${id}`

function readDraft(key: string): CardDraft | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CardDraft) : null
  } catch {
    return null
  }
}

/** Lädt Stapel (und beim Bearbeiten die Karte), bevor der Editor angezeigt wird. */
export function CardEditorPage() {
  const { deckId, cardId } = useParams()
  const [state, setState] = useState<{ deck?: Deck; card?: Card; missing?: boolean }>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const card = cardId ? await db.cards.get(cardId) : undefined
      const deck = await db.decks.get(card?.deckId ?? deckId ?? '')
      if (!cancelled) setState(deck && (!cardId || card) ? { deck, card } : { missing: true })
    })()
    return () => {
      cancelled = true
    }
  }, [deckId, cardId])

  if (state.missing) return <Navigate to="/ordner" replace />
  if (!state.deck) return <LibrarySkeleton />
  return <CardEditor key={cardId ?? deckId} deck={state.deck} card={state.card} />
}

function CardEditor({ deck, card }: { deck: Deck; card?: Card }) {
  const navigate = useNavigate()
  const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo
  const isEdit = Boolean(card)
  const storageKey = draftKey(isEdit ? 'edit' : 'new', card?.id ?? deck.id)
  const original = useRef<CardDraft>(card ? draftFromCard(card) : emptyDraft())

  const [draft, setDraft] = useState<CardDraft>(() => readDraft(storageKey) ?? original.current)
  const [formKey, setFormKey] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(() => Boolean(draft.hint || draft.notes || draft.tags.length))
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const shake = useAnimationControls()

  const dirty = JSON.stringify(draft) !== JSON.stringify(original.current)

  useEffect(() => {
    void allTags().then(setTagSuggestions)
    if (readDraft(storageKey)) toast('Entwurf wiederhergestellt')
  }, [storageKey])

  // Entwurf automatisch zwischenspeichern
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (dirty) localStorage.setItem(storageKey, JSON.stringify(draft))
        else localStorage.removeItem(storageKey)
      } catch {
        /* Speicher voll – Entwurf wird nicht gesichert */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [draft, dirty, storageKey])

  const patch = (p: Partial<CardDraft>) => setDraft((d) => ({ ...d, ...p }))
  const back = () => navigate(returnTo ?? `/stapel/${deck.id}`, { replace: true })

  const save = async (next: boolean) => {
    const error = validateDraft(draft)
    if (error) {
      toast(error, { tone: 'danger' })
      void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } })
      return
    }
    setBusy(true)
    try {
      if (card) await updateCard(card.id, draft)
      else await createCard(deck.id, draft)
      localStorage.removeItem(storageKey)
      if (next) {
        // Typ und Schlagwörter bleiben für die nächste Karte erhalten
        const fresh = emptyDraft(draft.type, draft.tags)
        original.current = fresh
        setDraft(fresh)
        setFormKey((k) => k + 1)
        setSavedCount((c) => c + 1)
        toast(`Karte gespeichert – weiter geht's mit Karte ${savedCount + 2}`, { tone: 'success' })
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        toast(isEdit ? 'Änderungen gespeichert' : 'Karte gespeichert', { tone: 'success' })
        back()
      }
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => (dirty ? setConfirmLeave(true) : back())

  const frontLabel = { basic: 'Vorderseite', reversible: 'Seite A', cloze: 'Lückentext', choice: 'Frage', input: 'Frage' }[draft.type]
  const backLabel = { basic: 'Rückseite', reversible: 'Seite B', cloze: 'Zusatzinfo (optional)', choice: 'Erklärung (optional)', input: 'Richtige Antwort' }[draft.type]
  const frontPlaceholder = {
    basic: 'Frage oder Begriff …',
    reversible: 'z. B. Begriff …',
    cloze: 'Text schreiben, Wort markieren und auf „Lücke“ tippen …',
    choice: 'Wie lautet die Frage?',
    input: 'Wie lautet die Frage?',
  }[draft.type]
  const backPlaceholder = {
    basic: 'Antwort …',
    reversible: 'z. B. Erklärung …',
    cloze: 'Wird nach dem Aufdecken angezeigt …',
    choice: 'Warum ist die Antwort richtig?',
    input: 'Die Antwort, die eingetippt werden muss …',
  }[draft.type]

  return (
    <div className="flex min-h-full flex-col">
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="flex h-14 items-center justify-between px-3">
          <button onClick={cancel} className="min-h-11 px-2 text-[16px] text-accent">
            Abbrechen
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[16px] font-semibold">{isEdit ? 'Karte bearbeiten' : 'Neue Karte'}</p>
            <p className="flex items-center justify-center gap-1 truncate text-[12px] text-ink-3">
              <ItemIcon icon={deck.icon} color={deck.color} size={14} /> {deck.name}
              {savedCount > 0 && <span className="ml-1 font-semibold text-success">· {savedCount} gespeichert</span>}
            </p>
          </div>
          <button onClick={() => setPreview(true)} className="flex min-h-11 items-center gap-1 px-2 text-[16px] text-accent" aria-label="Vorschau">
            <Eye size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-5 px-5 pb-6 pt-4">
        <TypePicker value={draft.type} onChange={(type) => patch({ type })} />

        <Field label={frontLabel}>
          <RichTextEditor
            key={`${formKey}-${draft.type}-front`}
            initial={draft.front}
            onChange={(front) => patch({ front })}
            placeholder={frontPlaceholder}
            label={frontLabel}
            cloze={draft.type === 'cloze'}
            autoFocus={!isEdit}
            minHeight={draft.type === 'cloze' ? 120 : 90}
          />
          {draft.type === 'cloze' && (
            <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink-3">
              Beispiel: <code className="rounded bg-surface-2 px-1">{'{{c1::Router}}'}</code> – jede Nummer wird eine eigene Abfrage. Mit{' '}
              <code className="rounded bg-surface-2 px-1">{'{{c1::443::Port}}'}</code> zeigst du einen Hinweis.
            </p>
          )}
        </Field>

        {draft.type === 'choice' && (
          <Field label="Antwortmöglichkeiten">
            <ChoicesEditor key={formKey} choices={draft.choices} onChange={(choices) => patch({ choices })} />
          </Field>
        )}

        <Field label={backLabel}>
          <RichTextEditor
            key={`${formKey}-${draft.type}-back`}
            initial={draft.back}
            onChange={(b) => patch({ back: b })}
            placeholder={backPlaceholder}
            label={backLabel}
            minHeight={draft.type === 'input' ? 56 : 90}
          />
        </Field>

        <section className="rounded-2xl border border-line bg-surface">
          <button
            onClick={() => setExtrasOpen((o) => !o)}
            aria-expanded={extrasOpen}
            className="flex min-h-12 w-full items-center justify-between px-4 text-[15px] font-medium"
          >
            <span>
              Extras <span className="text-ink-3">· Hinweis, Eselsbrücke, Schlagwörter</span>
            </span>
            <motion.span animate={{ rotate: extrasOpen ? 180 : 0 }}>
              <ChevronDown size={18} className="text-ink-3" />
            </motion.span>
          </button>
          <motion.div initial={false} animate={{ height: extrasOpen ? 'auto' : 0, opacity: extrasOpen ? 1 : 0 }} className="overflow-hidden">
            <div className="space-y-4 px-4 pb-4">
              <Field label="Hinweis (beim Lernen aufdeckbar)">
                <input
                  value={draft.hint}
                  onChange={(e) => patch({ hint: e.target.value })}
                  placeholder="z. B. Denk an die Schichten …"
                  className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                />
              </Field>
              <Field label="Eselsbrücke / Notiz (auf der Rückseite)">
                <textarea
                  value={draft.notes}
                  rows={2}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="z. B. „Alle deutschen Studenten trinken verschiedene Sorten Bier“"
                  className="w-full resize-none rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                />
              </Field>
              <Field label="Schlagwörter">
                <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} suggestions={tagSuggestions} />
              </Field>
            </div>
          </motion.div>
        </section>
      </div>

      <motion.footer animate={shake} className="glass sticky bottom-0 z-20 border-t border-line px-5 pb-[calc(var(--safe-bottom)+12px)] pt-3">
        {isEdit ? (
          <Button block disabled={busy} onClick={() => void save(false)}>
            <Save size={18} /> Speichern
          </Button>
        ) : (
          <div className="flex gap-2.5">
            <Button variant="secondary" disabled={busy} onClick={() => void save(false)} className="flex-1">
              Fertig
            </Button>
            <Button disabled={busy} onClick={() => void save(true)} className="flex-[1.6]">
              <SkipForward size={18} /> Speichern & nächste
            </Button>
          </div>
        )}
      </motion.footer>

      <CardPreviewSheet open={preview} onClose={() => setPreview(false)} draft={draft} />
      <ActionSheet
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        header={<p className="px-1 text-center text-[14px] text-ink-2">Du hast ungespeicherte Änderungen.</p>}
        actions={[
          { label: 'Änderungen verwerfen', icon: Trash2, danger: true, onSelect: () => (localStorage.removeItem(storageKey), back()) },
          { label: 'Weiter bearbeiten', icon: Eye, onSelect: () => undefined },
        ]}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[13px] font-semibold text-ink-2">{label}</p>
      {children}
    </div>
  )
}
