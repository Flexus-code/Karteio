import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, CloudDownload, CloudUpload, Combine, Replace, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionSheet } from '@/components/ActionSheet'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Sheet } from '@/components/Sheet'
import { db } from '@/db/db'
import { toast } from '@/store/toast'
import { createBackup, lastBackupAt, markBackupDone, parseKarteioFile, restoreBackup, type BackupFile } from './backup'
import { dateStamp, pickFile, shareOrDownload } from './files'

function ago(ts: number | null) {
  if (!ts) return 'noch nie'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  return days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`
}

export async function runBackup(): Promise<boolean> {
  const backup = await createBackup()
  const result = await shareOrDownload(`karteio-backup-${dateStamp()}.json`, JSON.stringify(backup), 'application/json')
  if (result === 'cancelled') return false
  markBackupDone()
  toast(`Backup erstellt: ${backup.data.cards.length} Karten`, { tone: 'success' })
  return true
}

/** Einstellungsbereich „Daten“ */
export function DataSection() {
  const navigate = useNavigate()
  const [last, setLast] = useState(lastBackupAt)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [wipeAsk, setWipeAsk] = useState(false)
  const [wipeConfirm, setWipeConfirm] = useState(false)
  const [wipeText, setWipeText] = useState('')
  const trashCount = useLiveQuery(async () => (await db.folders.where('deletedAt').above(0).count()) + (await db.decks.where('deletedAt').above(0).count()) + (await db.cards.where('deletedAt').above(0).count()))

  const backup = async () => {
    setBusy(true)
    try {
      if (await runBackup()) setLast(lastBackupAt())
    } catch {
      toast('Backup fehlgeschlagen.', { tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const chooseRestore = async () => {
    const file = await pickFile('.json,application/json')
    if (!file) return
    const parsed = parseKarteioFile(await file.text())
    if (parsed?.kind !== 'backup') {
      toast(parsed?.kind === 'share' ? 'Das ist ein geteilter Stapel – importiere ihn im Ordner-Tab über ＋ → Importieren.' : 'Keine gültige Karteio-Backup-Datei.', { tone: 'danger' })
      return
    }
    setPending(parsed.file)
  }

  const restore = async (mode: 'replace' | 'merge') => {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending, mode)
      toast(`Backup vom ${new Date(pending.exportedAt).toLocaleDateString('de-DE')} wiederhergestellt`, { tone: 'success' })
    } catch {
      toast('Wiederherstellen fehlgeschlagen – deine Daten sind unverändert.', { tone: 'danger' })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const wipe = async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    Object.keys(localStorage)
      .filter((k) => k.startsWith('karteio-') && k !== 'karteio-ui')
      .forEach((k) => localStorage.removeItem(k))
    setWipeConfirm(false)
    toast('Alle Daten gelöscht')
    navigate('/')
  }

  return (
    <>
      <Card className="divide-y divide-line">
        <Row icon={CloudUpload} label="Backup erstellen" detail={`Letztes: ${ago(last)}`} onClick={() => void backup()} disabled={busy} />
        <Row icon={CloudDownload} label="Backup wiederherstellen" onClick={() => void chooseRestore()} disabled={busy} />
        <Row icon={Trash2} label="Papierkorb" detail={trashCount ? `${trashCount}` : undefined} onClick={() => navigate('/papierkorb')} />
        <Row icon={TriangleAlert} label="Alle Daten löschen" danger onClick={() => setWipeAsk(true)} />
      </Card>
      <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink-3">
        Das Backup enthält alle Karten, Bilder, deinen Lernfortschritt und die Einstellungen. Sichere es z. B. über „In Dateien sichern“ in iCloud Drive.
      </p>

      <ActionSheet
        open={pending !== null}
        onClose={() => setPending(null)}
        header={
          pending && (
            <p className="px-1 text-center text-[14px] text-ink-2">
              Backup vom <b>{new Date(pending.exportedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</b> mit {pending.data.cards.length} Karten. Wie soll es wiederhergestellt werden?
            </p>
          )
        }
        actions={[
          { label: 'Zusammenführen (vorhandene Daten behalten)', icon: Combine, onSelect: () => void restore('merge') },
          { label: 'Alles ersetzen', icon: Replace, danger: true, onSelect: () => void restore('replace') },
        ]}
      />

      <ActionSheet
        open={wipeAsk}
        onClose={() => setWipeAsk(false)}
        header={<p className="px-1 text-center text-[14px] text-ink-2">Alle Ordner, Karten, Bilder und dein Lernfortschritt werden gelöscht. Erstelle vorher ein Backup!</p>}
        actions={[
          { label: 'Zuerst Backup erstellen', icon: CloudUpload, onSelect: () => void backup() },
          { label: 'Trotzdem alles löschen …', icon: TriangleAlert, danger: true, onSelect: () => (setWipeText(''), setWipeConfirm(true)) },
        ]}
      />
      <Sheet
        open={wipeConfirm}
        onClose={() => setWipeConfirm(false)}
        title="Wirklich alles löschen?"
        footer={
          <Button block variant="danger" disabled={wipeText.trim().toUpperCase() !== 'LÖSCHEN'} onClick={() => void wipe()}>
            Endgültig löschen
          </Button>
        }
      >
        <div className="space-y-3 pt-2">
          <p className="text-[14.5px] text-ink-2">
            Zur Sicherheit: Tippe <b>LÖSCHEN</b> ein.
          </p>
          <input
            value={wipeText}
            onChange={(e) => setWipeText(e.target.value)}
            autoCapitalize="characters"
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink outline-none focus:border-danger"
          />
        </div>
      </Sheet>
    </>
  )
}

function Row({ icon: Icon, label, detail, onClick, danger, disabled }: { icon: LucideIcon; label: string; detail?: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px] active:bg-surface-2 disabled:opacity-50">
      <Icon size={18} className={danger ? 'text-danger' : 'text-accent'} />
      <span className={`flex-1 ${danger ? 'text-danger' : ''}`}>{label}</span>
      {detail && <span className="text-[13.5px] text-ink-3">{detail}</span>}
      {!danger && <ChevronRight size={18} className="text-ink-3" />}
    </button>
  )
}
