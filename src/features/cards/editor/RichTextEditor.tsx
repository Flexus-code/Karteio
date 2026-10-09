import { EditorContent, useEditor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import type { RichText } from '@/db/types'
import { editorExtensions } from './extensions'
import { Toolbar } from './Toolbar'

interface RichTextEditorProps {
  /** Anfangsinhalt – für einen kompletten Neustart den `key` der Komponente ändern */
  initial: RichText
  onChange: (doc: RichText) => void
  placeholder: string
  label: string
  cloze?: boolean
  autoFocus?: boolean
  minHeight?: number
}

export function RichTextEditor({ initial, onChange, placeholder, label, cloze, autoFocus, minHeight = 96 }: RichTextEditorProps) {
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const extensions = useMemo(() => editorExtensions(placeholder), [placeholder])

  const editor = useEditor({
    extensions,
    content: initial,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rte rte-editable',
        'aria-label': label,
        style: `min-height:${minHeight}px`,
        autocapitalize: 'sentences',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichText),
    onFocus: () => setFocused(true),
  })

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface transition-colors ${focused ? 'border-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-line'}`}
      ref={wrapperRef}
      onBlur={() => {
        // iOS fokussiert Buttons beim Antippen nicht – kurz warten, ob der Fokus zurückkommt
        setTimeout(() => {
          const inside = wrapperRef.current?.contains(document.activeElement)
          if (!inside && !editor?.isFocused) setFocused(false)
        }, 220)
      }}
    >
      <AnimatePresence initial={false}>
        {focused && editor && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <Toolbar editor={editor} cloze={cloze} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Tippen in den leeren Bereich setzt den Cursor ans Ende */}
      <div className="cursor-text px-4 py-3" onClick={(e) => e.target === e.currentTarget && editor?.commands.focus('end')}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
