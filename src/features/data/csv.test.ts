import { describe, expect, it } from 'vitest'
import { docToText } from '@/features/cards/richtext'
import { rowsToDrafts } from './cardsCsv'
import { detectDelimiter, looksLikeHeader, parseCsv, toCsv } from './csv'

describe('CSV', () => {
  it('liest einfache Zeilen', () => {
    expect(parseCsv('Router;Verbindet Netze;netz\nSwitch;Verbindet Geräte', ';')).toEqual([
      ['Router', 'Verbindet Netze', 'netz'],
      ['Switch', 'Verbindet Geräte'],
    ])
  })

  it('beachtet Anführungszeichen, Trennzeichen und Umbrüche im Feld', () => {
    const text = '"Was ist ""TCP""?";"verbindungs-\norientiert; zuverlässig"\r\n'
    expect(parseCsv(text, ';')).toEqual([['Was ist "TCP"?', 'verbindungs-\norientiert; zuverlässig']])
  })

  it('überspringt Leerzeilen und BOM', () => {
    expect(parseCsv('﻿a,b\n\n\nc,d\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('unterstützt mehrzeichige Trennzeichen', () => {
    expect(parseCsv('HTTP - Port 80\nHTTPS - Port 443', ' - ')).toEqual([
      ['HTTP', 'Port 80'],
      ['HTTPS', 'Port 443'],
    ])
  })

  it('erkennt das Trennzeichen', () => {
    expect(detectDelimiter('a;b\nc;d')).toBe(';')
    expect(detectDelimiter('a\tb\nc\td')).toBe('\t')
    expect(detectDelimiter('HTTP - Port 80\nHTTPS - Port 443')).toBe(' - ')
  })

  it('erkennt Kopfzeilen', () => {
    expect(looksLikeHeader(['Vorderseite', 'Rückseite'])).toBe(true)
    expect(looksLikeHeader(['Router', 'Netz'])).toBe(false)
  })

  it('schreibt CSV, das sich wieder einlesen lässt', () => {
    const rows = [
      ['Frage; mit Semikolon', 'Antwort "zitiert"'],
      ['Zeile\nUmbruch', 'x'],
    ]
    expect(parseCsv(toCsv(rows), ';')).toEqual(rows)
  })
})


describe('CSV → Karten', () => {
  it('überspringt Kopfzeile, erkennt Lückentext und Schlagwörter', () => {
    const drafts = rowsToDrafts(
      [
        ['Frage', 'Antwort', 'Tags'],
        ['Router?', 'Schicht 3', '#netz osi'],
        ['TCP ist {{c1::verbindungsorientiert}}', ''],
        ['ohne Antwort', ''],
      ],
      ['import'],
    )
    expect(drafts).toHaveLength(2)
    expect(drafts[0]!.tags).toEqual(['netz', 'osi', 'import'])
    expect(docToText(drafts[0]!.back)).toBe('Schicht 3')
    expect(drafts[1]!.type).toBe('cloze')
  })
})
