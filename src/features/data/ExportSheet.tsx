import { FileJson, FileSpreadsheet, Printer } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '@/components/Sheet'
import { db } from '@/db/db'
import type { Id } from '@/db/types'
import { toast } from '@/store/toast'
import { createSharePackage } from './backup'
import { cardsToCsv } from './cardsCsv'
import { safeFilename, shareOrDownload } from './files'

interface ExportSheetProps {
  open: boolean
  onClose: () => void
  scope: { kind: 'folder' | 'deck'; id: Id; name: string } | null
}

/** Ordner oder Stapel teilen/exportieren */
export function ExportSheet({ open, onClose, scope }: ExportSheetProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch {
      toast('Export fehlgeschlagen.', { tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const shareKarteio = () =>
    run(async () => {
      if (!scope) return
      const pkg = await createSharePackage(scope)
      const result = await shareOrDownload(`${safeFilename(scope.name)}.karteio.json`, JSON.stringify(pkg), 'application/json')
      if (result !== 'cancelled') {
        toast(`${pkg.cards.length} Karten exportiert`, { tone: 'success' })
        onClose()
      }
    })

  const shareCsv = () =>
    run(async () => {
      if (!scope || scope.kind !== 'deck') return
      const cards = (await db.cards.where('deckId').equals(scope.id).toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.createdAt - b.createdAt)
      const result = await shareOrDownload(`${safeFilename(scope.name)}.csv`, cardsToCsv(cards), 'text/csv')
      if (result !== 'cancelled') onClose()
    })

  return (
    <Sheet open={open} onClose={onClose} title={scope ? `„${scope.name}“ teilen` : ''}>
      <div className="space-y-2.5 pb-2 pt-1">
        <Option
          icon={FileJson}
          title="Karteio-Datei"
          text="Mit Bildern und allen Kartentypen – zum Teilen mit Mitschülern oder als Sicherung dieses Bereichs. Ohne Lernfortschritt."
          disabled={busy}
          onClick={() => void shareKarteio()}
        />
        {scope?.kind === 'deck' && (
          <>
            <Option icon={FileSpreadsheet} title="CSV-Tabelle" text="Für Excel, Numbers oder andere Lern-Apps (nur Text)." disabled={busy} onClick={() => void shareCsv()} />
            <Option
              icon={Printer}
              title="Drucken / PDF"
              text="Alle Karten als Liste – im Druckdialog „Als PDF sichern“ wählen."
              disabled={busy}
              onClick={() => {
                onClose()
                navigate(`/stapel/${scope.id}/druck`)
              }}
            />
          </>
        )}
      </div>
    </Sheet>
  )
}

function Option({ icon: Icon, title, text, onClick, disabled }: { icon: typeof Printer; title: string; text: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="flex w-full items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 text-left shadow-soft active:bg-surface-2 disabled:opacity-50">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon size={22} />
      </span>
      <span>
        <span className="block text-[15.5px] font-semibold">{title}</span>
        <span className="block text-[13px] leading-snug text-ink-2">{text}</span>
      </span>
    </button>
  )
}
