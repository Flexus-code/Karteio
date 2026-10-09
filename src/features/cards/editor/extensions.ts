import { Mark, mergeAttributes, type Extensions } from '@tiptap/react'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import { ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { MediaImageView } from './MediaImageView'

/** Bild, das auf einen Eintrag in der lokalen Medien-Tabelle verweist (statt auf eine URL). */
export const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaImageView)
  },
}).configure({ inline: false, allowBase64: false })

/** Markierung für Lücken in der Anzeige (verdeckt / aufgedeckt / andere Lücke) */
export const ClozeMark = Mark.create({
  name: 'cloze',
  addAttributes() {
    return { state: { default: 'revealed' } }
  },
  parseHTML() {
    return [{ tag: 'span[data-cloze]' }]
  },
  renderHTML({ HTMLAttributes, mark }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-cloze': mark.attrs.state, class: 'cloze' }), 0]
  },
})

function baseExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    TableKit.configure({ table: { resizable: false } }),
    MediaImage,
    ClozeMark,
  ]
}

export function editorExtensions(placeholder: string): Extensions {
  return [...baseExtensions(), Placeholder.configure({ placeholder })]
}

export function viewerExtensions(): Extensions {
  return baseExtensions()
}
