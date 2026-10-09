/** CSV/Text lesen und schreiben (RFC 4180: Anführungszeichen, Trennzeichen und Zeilenumbrüche in Feldern) */

export type Delimiter = ';' | ',' | '\t' | ' - ' | '|'

export const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: ';', label: 'Semikolon ;' },
  { value: ',', label: 'Komma ,' },
  { value: '\t', label: 'Tabulator' },
  { value: ' - ', label: 'Bindestrich  - ' },
  { value: '|', label: 'Strich |' },
]

/** Rät das Trennzeichen anhand der ersten Zeilen */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10)
  const score = (d: Delimiter) => {
    const counts = lines.map((l) => l.split(d).length - 1)
    const withIt = counts.filter((c) => c > 0).length
    return withIt === 0 ? 0 : withIt * 10 - (Math.max(...counts) - Math.min(...counts))
  }
  const order: Delimiter[] = ['\t', ';', '|', ',', ' - ']
  return order.reduce((best, d) => (score(d) > score(best) ? d : best), order[0]!)
}

export function parseCsv(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const src = text.replace(/^﻿/, '')
  const d = delimiter

  while (i < src.length) {
    const ch = src[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"' && field.trim() === '') {
      inQuotes = true
      field = ''
      i++
      continue
    }
    if (src.startsWith(d, i)) {
      row.push(field)
      field = ''
      i += d.length
      continue
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1
      continue
    }
    field += ch
    i++
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f))
}

/** Erkennt eine Kopfzeile wie „Vorderseite;Rückseite“ oder „Frage,Antwort“ */
export function looksLikeHeader(row: string[] | undefined): boolean {
  if (!row) return false
  const first = (row[0] ?? '').toLowerCase()
  return /^(vorderseite|frage|front|question|begriff|seite a)$/.test(first)
}

function escapeField(value: string, delimiter: string) {
  return /["\r\n]/.test(value) || value.includes(delimiter) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(rows: string[][], delimiter = ';'): string {
  // BOM, damit Excel Umlaute richtig erkennt
  return '﻿' + rows.map((r) => r.map((f) => escapeField(f, delimiter)).join(delimiter)).join('\r\n')
}
