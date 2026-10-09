import type { RichText } from '@/db/types'
import type { RTNode } from './richtext'

/** `{{c1::Antwort}}` oder `{{c1::Antwort::Hinweis}}` */
const CLOZE_RE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g

export interface ClozeMatch {
  index: number
  answer: string
  hint?: string
  start: number
  end: number
  /** Position der Antwort innerhalb des Treffers */
  answerStart: number
  answerEnd: number
}

export function findClozes(text: string): ClozeMatch[] {
  const result: ClozeMatch[] = []
  for (const m of text.matchAll(CLOZE_RE)) {
    const start = m.index
    const prefix = `{{c${m[1]}::`
    const answer = m[2] ?? ''
    result.push({
      index: Number(m[1]),
      answer,
      hint: m[3] || undefined,
      start,
      end: start + m[0].length,
      answerStart: start + prefix.length,
      answerEnd: start + prefix.length + answer.length,
    })
  }
  return result
}

/** Sortierte, eindeutige Lückennummern */
export function clozeNumbers(text: string): number[] {
  return [...new Set(findClozes(text).map((c) => c.index))].sort((a, b) => a - b)
}

export function nextClozeNumber(text: string): number {
  const nums = clozeNumbers(text)
  return nums.length ? Math.max(...nums) + 1 : 1
}

/** Ersetzt alle Lücken durch ihre Antwort (z. B. für Suche und Listen) */
export function stripCloze(text: string): string {
  return text.replace(CLOZE_RE, (_, _n, answer: string) => answer)
}

export type ClozeMode = 'question' | 'answer'

const PLACEHOLDER = '￼'

type Run = { kind: 'text'; text: string; marks?: RTNode['marks'] } | { kind: 'node'; node: RTNode }

function runLength(r: Run) {
  return r.kind === 'text' ? r.text.length : 1
}

/** Schneidet den Bereich [start, end) aus den Runs heraus und behält die Formatierung bei. */
function sliceRuns(runs: Run[], start: number, end: number, extraMark?: NonNullable<RTNode['marks']>[number]): RTNode[] {
  const out: RTNode[] = []
  let pos = 0
  for (const r of runs) {
    const len = runLength(r)
    const rs = pos
    const re = pos + len
    pos = re
    if (re <= start || rs >= end) continue
    if (r.kind === 'node') {
      out.push(r.node)
      continue
    }
    const text = r.text.slice(Math.max(0, start - rs), Math.min(len, end - rs))
    if (!text) continue
    const marks = [...(r.marks ?? []), ...(extraMark ? [extraMark] : [])]
    out.push({ type: 'text', text, ...(marks.length ? { marks } : {}) })
  }
  return out
}

function transformInline(content: RTNode[], active: number | null, mode: ClozeMode): RTNode[] {
  const runs: Run[] = content.map((n) => (n.type === 'text' ? { kind: 'text', text: n.text ?? '', marks: n.marks } : { kind: 'node', node: n }))
  const flat = runs.map((r) => (r.kind === 'text' ? r.text : PLACEHOLDER)).join('')
  const matches = findClozes(flat)
  if (matches.length === 0) return content

  const out: RTNode[] = []
  let cursor = 0
  for (const m of matches) {
    out.push(...sliceRuns(runs, cursor, m.start))
    const isActive = active === null || m.index === active
    if (isActive && mode === 'question') {
      out.push({ type: 'text', text: m.hint ? `[${m.hint}]` : '[…]', marks: [{ type: 'cloze', attrs: { state: 'hidden' } }] })
    } else {
      const state = isActive ? 'revealed' : 'other'
      out.push(...sliceRuns(runs, m.answerStart, m.answerEnd, { type: 'cloze', attrs: { state } }))
    }
    cursor = m.end
  }
  out.push(...sliceRuns(runs, cursor, flat.length))
  return out
}

/**
 * Bereitet ein Lückentext-Dokument zur Anzeige vor.
 * `active`: die abgefragte Lücke (`null` = alle). Formatierungen innerhalb der Lücken bleiben erhalten.
 */
export function renderClozeDoc(doc: RichText, active: number | null, mode: ClozeMode): RichText {
  const walk = (node: RTNode): RTNode => {
    if (!node.content) return node
    const hasInline = node.content.some((c) => c.type === 'text')
    return { ...node, content: hasInline ? transformInline(node.content, active, mode) : node.content.map(walk) }
  }
  return walk(doc as RTNode) as RichText
}
