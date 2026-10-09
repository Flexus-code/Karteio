import { useEditorState, type Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bold,
  Brackets,
  Code2,
  Columns3,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Mic,
  List,
  ListOrdered,
  Palette,
  Redo2,
  Rows3,
  Strikethrough,
  Table,
  Trash2,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from '@/store/toast'
import { nextClozeNumber } from '../cloze'
import { saveImage } from '../media'
import { useSpeech } from '@/features/voice/useSpeech'

const TEXT_COLORS = [
  { label: 'Standard', value: null, swatch: 'var(--text)' },
  { label: 'Rot', value: '#e11d48', swatch: '#e11d48' },
  { label: 'Blau', value: '#2563eb', swatch: '#2563eb' },
  { label: 'Grün', value: '#16a34a', swatch: '#16a34a' },
  { label: 'Lila', value: '#9333ea', swatch: '#9333ea' },
  { label: 'Orange', value: '#ea580c', swatch: '#ea580c' },
]

const HIGHLIGHTS = [
  { label: 'Gelb', value: '#fde68a' },
  { label: 'Grün', value: '#bbf7d0' },
  { label: 'Rosa', value: '#fbcfe8' },
  { label: 'Blau', value: '#bfdbfe' },
]

interface ToolbarProps {
  editor: Editor
  cloze?: boolean
}

export function Toolbar({ editor, cloze }: ToolbarProps) {
  const [colorsOpen, setColorsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      heading: e.isActive('heading', { level: 2 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      code: e.isActive('codeBlock'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()

  const speech = useSpeech({
    onFinal: (text) => {
      // Leerzeichen davor, wenn direkt an Text angehängt wird
      const before = editor.state.doc.textBetween(Math.max(0, editor.state.selection.from - 1), editor.state.selection.from)
      chain().insertContent((before && before !== ' ' ? ' ' : '') + text).run()
    },
  })
  useEffect(() => {
    if (speech.error) toast(speech.error, { tone: 'danger' })
  }, [speech.error])

  const insertCloze = () => {
    const n = nextClozeNumber(editor.getText())
    const { from, to, empty } = editor.state.selection
    if (empty) {
      chain()
        .insertContent(`{{c${n}::}}`)
        .setTextSelection(from + `{{c${n}::`.length)
        .run()
    } else {
      // Erst das Ende einfügen, damit die Startposition gültig bleibt
      chain().insertContentAt(to, '}}').insertContentAt(from, `{{c${n}::`).run()
    }
  }

  const onPickImage = async (file: File | undefined) => {
    if (!file) return
    try {
      const mediaId = await saveImage(file)
      chain().insertContent({ type: 'image', attrs: { mediaId } }).run()
    } catch {
      toast('Das Bild konnte nicht geladen werden.', { tone: 'danger' })
    }
  }

  return (
    <div className="border-b border-line" onMouseDown={(e) => e.target instanceof HTMLButtonElement && e.preventDefault()}>
      <div className="scroll-area flex items-center gap-0.5 overflow-x-auto px-1.5 py-1">
        {cloze && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertCloze}
            className="mr-1 flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-[13px] font-semibold text-white"
          >
            <Brackets size={16} /> Lücke
          </button>
        )}
        {speech.supported && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            aria-label={speech.listening ? 'Diktat beenden' : 'Diktieren'}
            className={`mr-1 flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ${speech.listening ? 'animate-pulse bg-danger text-white' : 'bg-accent-soft text-accent'}`}
          >
            <Mic size={16} /> {speech.listening ? 'Stopp' : 'Diktieren'}
          </button>
        )}
        <Tool icon={Bold} label="Fett" active={s.bold} onClick={() => chain().toggleBold().run()} />
        <Tool icon={Italic} label="Kursiv" active={s.italic} onClick={() => chain().toggleItalic().run()} />
        <Tool icon={Underline} label="Unterstrichen" active={s.underline} onClick={() => chain().toggleUnderline().run()} />
        <Tool icon={Strikethrough} label="Durchgestrichen" active={s.strike} onClick={() => chain().toggleStrike().run()} />
        <Tool icon={Highlighter} label="Markieren" active={s.highlight} onClick={() => chain().toggleHighlight({ color: HIGHLIGHTS[0]!.value }).run()} />
        <Tool icon={Palette} label="Farben" active={colorsOpen} onClick={() => {
            setColorsOpen((o) => !o)
            editor.commands.focus()
          }} />
        <Divider />
        <Tool icon={Heading2} label="Überschrift" active={s.heading} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
        <Tool icon={List} label="Aufzählung" active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
        <Tool icon={ListOrdered} label="Nummerierung" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
        <Tool icon={Code2} label="Code" active={s.code} onClick={() => chain().toggleCodeBlock().run()} />
        <Tool icon={Table} label="Tabelle" active={s.table} onClick={() => chain().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()} />
        <Tool icon={ImagePlus} label="Bild" onClick={() => fileRef.current?.click()} />
        <Divider />
        <Tool icon={Undo2} label="Rückgängig" disabled={!s.canUndo} onClick={() => chain().undo().run()} />
        <Tool icon={Redo2} label="Wiederholen" disabled={!s.canRedo} onClick={() => chain().redo().run()} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void onPickImage(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {colorsOpen && (
          <Row key="colors">
            {TEXT_COLORS.map((c) => (
              <Swatch
                key={c.label}
                label={`Textfarbe ${c.label}`}
                onClick={() => (c.value ? chain().setColor(c.value).run() : chain().unsetColor().run())}
              >
                <span className="text-[15px] font-bold" style={{ color: c.swatch }}>
                  A
                </span>
              </Swatch>
            ))}
            <Divider />
            {HIGHLIGHTS.map((h) => (
              <Swatch key={h.label} label={`Markierung ${h.label}`} onClick={() => chain().setHighlight({ color: h.value }).run()}>
                <span className="size-5 rounded-md" style={{ background: h.value }} />
              </Swatch>
            ))}
            <Swatch label="Markierung entfernen" onClick={() => chain().unsetHighlight().run()}>
              <span className="text-[11px] font-semibold text-ink-3">ohne</span>
            </Swatch>
          </Row>
        )}
        {s.table && (
          <Row key="table">
            <TextTool icon={Rows3} label="Zeile +" onClick={() => chain().addRowAfter().run()} />
            <TextTool icon={Columns3} label="Spalte +" onClick={() => chain().addColumnAfter().run()} />
            <TextTool icon={Rows3} label="Zeile −" onClick={() => chain().deleteRow().run()} />
            <TextTool icon={Columns3} label="Spalte −" onClick={() => chain().deleteColumn().run()} />
            <TextTool icon={Trash2} label="Tabelle" danger onClick={() => chain().deleteTable().run()} />
          </Row>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="scroll-area flex items-center gap-1 overflow-x-auto border-t border-line px-1.5 py-1">{children}</div>
    </motion.div>
  )
}

interface ToolProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

function Tool({ icon: Icon, label, onClick, active, disabled }: ToolProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${active ? 'bg-accent-soft text-accent' : 'text-ink-2 active:bg-surface-2'}`}
    >
      <Icon size={18} strokeWidth={2.2} />
    </button>
  )
}

function TextTool({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2.5 text-[12.5px] font-medium ${danger ? 'text-danger' : 'text-ink-2'}`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function Swatch({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" />
}
