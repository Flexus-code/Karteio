import type { RichText, RichTextNode } from '@/db/types'

export type RTNode = RichTextNode

export const EMPTY_DOC: RichText = { type: 'doc', content: [{ type: 'paragraph' }] }

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'tableCell', 'tableHeader', 'blockquote'])

function nodesOf(doc: RichText | undefined): RTNode[] {
  return doc?.content ?? []
}

/** Reiner Text eines Dokuments; Blöcke werden durch Zeilenumbrüche getrennt. */
export function docToText(doc: RichText | undefined): string {
  const lines: string[] = []
  const walk = (node: RTNode, acc: string[]) => {
    if (node.type === 'text') acc.push(node.text ?? '')
    else if (node.type === 'hardBreak') acc.push('\n')
    else if (node.type === 'image') acc.push('🖼️')
    if (BLOCK_TYPES.has(node.type) && !node.content?.some((c) => BLOCK_TYPES.has(c.type))) {
      const inner: string[] = []
      node.content?.forEach((c) => walk(c, inner))
      lines.push(inner.join(''))
      return
    }
    node.content?.forEach((c) => walk(c, acc))
  }
  nodesOf(doc).forEach((n) => {
    const acc: string[] = []
    walk(n, acc)
    if (acc.length) lines.push(acc.join(''))
  })
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

export function isDocEmpty(doc: RichText | undefined): boolean {
  if (docToText(doc).trim().length > 0) return false
  return collectMediaIds(doc).length === 0
}

/** IDs aller Bilder (Medien-Tabelle) im Dokument */
export function collectMediaIds(doc: RichText | undefined): string[] {
  const ids: string[] = []
  const walk = (n: RTNode) => {
    if (n.type === 'image' && typeof n.attrs?.mediaId === 'string') ids.push(n.attrs.mediaId)
    n.content?.forEach(walk)
  }
  nodesOf(doc).forEach(walk)
  return ids
}

/** Einfacher Text → Dokument (Zeilen werden Absätze), z. B. für CSV-Import */
export function textToDoc(text: string): RichText {
  const lines = text.split(/\r?\n/)
  return {
    type: 'doc',
    content: lines.map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })),
  }
}
