import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useMemo } from 'react'
import type { RichText } from '@/db/types'
import { viewerExtensions } from './extensions'

interface RichTextViewProps {
  content: RichText
  className?: string
}

/** Schreibgeschützte Anzeige eines Karteninhalts (inkl. Bilder und Lücken). */
export function RichTextView({ content, className = '' }: RichTextViewProps) {
  const extensions = useMemo(() => viewerExtensions(), [])
  const editor = useEditor({ extensions, content, editable: false, editorProps: { attributes: { class: `rte ${className}` } } })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  return <EditorContent editor={editor} />
}
