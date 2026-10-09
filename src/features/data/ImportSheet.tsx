import { ClipboardPaste, FileUp, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { db } from '@/db/db'
import type { Id } from '@/db/types'
import { createCard } from '@/features/cards/repo'
import { docToText } from '@/features/cards/richtext'
import { createDeck } from '@/features/library/repo'
import { toast } from '@/store/toast'
import { importSharePackage, parseKarteioFile, type SharePackage } from './backup'
import { rowsToDrafts } from './cardsCsv'
import { DELIMITERS, detectDelimiter, parseCsv, type Delimiter } from './csv'
import { pickFile } from './files'

interface ImportSheetProps {
  open: boolean
  onClose: () => void
  /** Ziel: in einen Stapel (nur CSV/Text) oder in einen Ordner (`null` = oberste Ebene) */
  target: { deckId: Id } | { folderId: Id | null }
}

type Stage = { kind: 'choose' } | { kind: 'text'; text: string; name: string } | { kind: 'share'; pkg: SharePackage } | { kind: 'backup' }

export function ImportSheet({ open, onClose, target }: ImportSheetProps) {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>({ kind: 'choose' })
  const [paste, setPaste] = useState(false)
  const [pasted, setPasted] = useState('')
  const [delimiter, setDelimiter] = useState<Delimiter>(';')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStage({ kind: 'choose' })
    setPaste(false)
    setPasted('')
  }, [open])

  const toDeck = 'deckId' in target
  const rows = useMemo(() => (stage.kind === 'text' ? parseCsv(stage.text, delimiter) : []), [stage, delimiter])
  const drafts = useMemo(() => rowsToDrafts(rows), [rows])

  const loadText = (text: string, name: string) => {
    const karteio = parseKarteioFile(text)
    if (karteio?.kind === 'share') return setStage({ kind: 'share', pkg: karteio.file })
    if (karteio?.kind === 'backup') return setStage({ kind: 'backup' })
    setDelimiter(detectDelimiter(text))
    setStage({ kind: 'text', text, name })
  }

  const chooseFile = async () => {
    const file = await pickFile('.json,.csv,.txt,.tsv,text/plain,text/csv,application/json')
    if (!file) return
    loadText(await file.text(), file.name.replace(/\.(csv|txt|tsv|json)$/i, '').replace(/\.karteio$/i, ''))
  }

  const importText = async () => {
    if (stage.kind !== 'text' || drafts.length === 0) return
    setBusy(true)
    try {
      let deckId: Id
      if (toDeck) deckId = target.deckId
      else {
        const deck = await createDeck({ name: stage.name || 'Importiert', description: 'Importiert', color: 'teal', icon: '📥', folderId: target.folderId })
        deckId = deck.id
      }
      await db.transaction('rw', [db.cards, db.cardStates, db.media], async () => {
        for (const d of drafts) await createCard(deckId, d)
      })
      toast(`${drafts.length} Karten importiert`, { tone: 'success' })
      onClose()
      if (!toDeck) navigate(`/stapel/${deckId}`)
    } finally {
      setBusy(false)
    }
  }

  const importShare = async () => {
    if (stage.kind !== 'share') return
    setBusy(true)
    try {
      const folderId = toDeck ? null : target.folderId
      const res = await importSharePackage(stage.pkg, folderId)
      toast(`„${stage.pkg.name}“ importiert: ${res.cards} Karten`, { tone: 'success' })
      onClose()
      if (res.rootFolderId) navigate(`/ordner/${res.rootFolderId}`)
      else if (res.rootDeckId) navigate(`/stapel/${res.rootDeckId}`)
    } finally {
      setBusy(false)
    }
  }

  const footer =
    stage.kind === 'text' ? (
      <Button block disabled={busy || drafts.length === 0} onClick={() => void importText()}>
        {drafts.length === 0 ? 'Keine Karten erkannt' : `${drafts.length} Karten importieren`}
      </Button>
    ) : stage.kind === 'share' ? (
      <Button block disabled={busy} onClick={() => void importShare()}>
        Importieren
      </Button>
    ) : paste ? (
      <Button block disabled={!pasted.trim()} onClick={() => loadText(pasted, 'Eingefügt')}>
        Weiter
      </Button>
    ) : undefined

  return (
    <Sheet open={open} onClose={onClose} title="Importieren" footer={footer}>
      <div className="space-y-4 pb-2 pt-1">
        {stage.kind === 'choose' && !paste && (
          <>
            <p className="text-center text-[14px] text-ink-2">
              {toDeck ? 'Karten aus einer CSV- oder Textdatei in diesen Stapel übernehmen.' : 'Geteilte Karteio-Stapel oder CSV-/Textdateien importieren.'}
            </p>
            <BigOption icon={FileUp} title="Datei auswählen" text={toDeck ? 'CSV oder Text (.csv, .txt)' : 'Karteio-Datei (.json), CSV oder Text'} onClick={() => void chooseFile()} />
            <BigOption icon={ClipboardPaste} title="Text einfügen" text="z. B. aus Notizen: eine Karte pro Zeile, Frage und Antwort getrennt" onClick={() => setPaste(true)} />
            <div className="flex gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
              <Info size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Format: <code>Vorderseite;Rückseite;Schlagwörter</code> – eine Karte pro Zeile. Auch Komma, Tabulator oder „ - “ als Trenner funktionieren. Lücken mit <code>{'{{c1::…}}'}</code> werden erkannt.
              </span>
            </div>
          </>
        )}

        {stage.kind === 'choose' && paste && (
          <textarea
            autoFocus
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={9}
            placeholder={'Router;Verbindet Netzwerke\nSwitch;Verbindet Geräte im LAN\nHTTPS;Port 443'}
            className="w-full resize-none rounded-2xl border border-line bg-surface-2 px-4 py-3 font-mono text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        )}

        {stage.kind === 'backup' && (
          <div className="rounded-2xl bg-warning/12 px-4 py-3 text-[14px] leading-relaxed">
            Das ist ein vollständiges <b>Backup</b>. Stelle es unter <b>Einstellungen → Daten → Backup wiederherstellen</b> wieder her.
            <Button
              block
              variant="secondary"
              className="mt-3"
              onClick={() => {
                onClose()
                navigate('/einstellungen')
              }}
            >
              Zu den Einstellungen
            </Button>
          </div>
        )}

        {stage.kind === 'share' && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[17px] font-semibold">{stage.pkg.name}</p>
            <p className="mt-1 text-[14px] text-ink-2">
              {stage.pkg.folders.length > 0 && `${stage.pkg.folders.length} Ordner · `}
              {stage.pkg.decks.length} {stage.pkg.decks.length === 1 ? 'Stapel' : 'Stapel'} · {stage.pkg.cards.length} Karten
              {stage.pkg.media.length > 0 && ` · ${stage.pkg.media.length} Bilder`}
            </p>
            <p className="mt-2 text-[12.5px] text-ink-3">Wird {toDeck ? 'auf oberster Ebene' : 'hier'} angelegt. Dein Lernfortschritt beginnt bei null.</p>
          </div>
        )}

        {stage.kind === 'text' && (
          <>
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">Trennzeichen</p>
              <div className="scroll-area flex gap-1.5 overflow-x-auto">
                {DELIMITERS.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setDelimiter(d.value)}
                    className={`h-9 shrink-0 rounded-full px-3 text-[13px] font-medium ${delimiter === d.value ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">Vorschau ({drafts.length} Karten)</p>
              <div className="overflow-hidden rounded-2xl border border-line">
                {drafts.slice(0, 5).map((d, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 border-b border-line px-3.5 py-2.5 text-[13.5px] last:border-b-0">
                    <span className="line-clamp-2 font-medium">{docToText(d.front)}</span>
                    <span className="line-clamp-2 text-ink-2">{d.type === 'cloze' ? '(Lückentext)' : docToText(d.back)}</span>
                  </div>
                ))}
                {drafts.length === 0 && <p className="px-4 py-6 text-center text-[13.5px] text-ink-3">Probiere ein anderes Trennzeichen.</p>}
              </div>
              {drafts.length > 5 && <p className="mt-1.5 px-1 text-[12.5px] text-ink-3">… und {drafts.length - 5} weitere</p>}
            </div>
            {!toDeck && <p className="px-1 text-[12.5px] text-ink-3">Es wird ein neuer Stapel „{stage.name || 'Importiert'}“ angelegt.</p>}
          </>
        )}
      </div>
    </Sheet>
  )
}

function BigOption({ icon: Icon, title, text, onClick }: { icon: typeof FileUp; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-left shadow-soft active:bg-surface-2">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon size={22} />
      </span>
      <span>
        <span className="block text-[15.5px] font-semibold">{title}</span>
        <span className="block text-[13px] text-ink-2">{text}</span>
      </span>
    </button>
  )
}
