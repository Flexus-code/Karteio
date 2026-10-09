import { describe, expect, it } from 'vitest'
import type { RichText, RichTextNode } from '@/db/types'
import { clozeNumbers, findClozes, nextClozeNumber, renderClozeDoc, stripCloze } from './cloze'
import { docToText } from './richtext'

const doc = (content: RichTextNode[]): RichText => ({ type: 'doc', content: [{ type: 'paragraph', content }] })

describe('Lückentext', () => {
  it('findet Lücken mit und ohne Hinweis', () => {
    const c = findClozes('Die {{c1::Vermittlungsschicht}} ist Schicht {{c2::3::Zahl}}.')
    expect(c.map((x) => [x.index, x.answer, x.hint])).toEqual([
      [1, 'Vermittlungsschicht', undefined],
      [2, '3', 'Zahl'],
    ])
  })

  it('liefert eindeutige, sortierte Nummern', () => {
    expect(clozeNumbers('{{c2::a}} {{c1::b}} {{c2::c}}')).toEqual([1, 2])
    expect(nextClozeNumber('{{c2::a}} {{c1::b}}')).toBe(3)
    expect(nextClozeNumber('kein Treffer')).toBe(1)
  })

  it('entfernt die Syntax', () => {
    expect(stripCloze('A {{c1::B::Hinweis}} C')).toBe('A B C')
  })

  it('verdeckt nur die aktive Lücke', () => {
    const d = doc([{ type: 'text', text: 'TCP ist {{c1::verbindungsorientiert}}, UDP {{c2::verbindungslos}}.' }])
    expect(docToText(renderClozeDoc(d, 1, 'question'))).toBe('TCP ist […], UDP verbindungslos.')
    expect(docToText(renderClozeDoc(d, 1, 'answer'))).toBe('TCP ist verbindungsorientiert, UDP verbindungslos.')
    expect(docToText(renderClozeDoc(d, null, 'question'))).toBe('TCP ist […], UDP […].')
  })

  it('zeigt den Hinweis statt der Antwort', () => {
    const d = doc([{ type: 'text', text: 'Port {{c1::443::HTTPS}}' }])
    expect(docToText(renderClozeDoc(d, 1, 'question'))).toBe('Port [HTTPS]')
  })

  it('funktioniert über formatierte Textteile hinweg und behält Formatierung', () => {
    const d = doc([
      { type: 'text', text: 'Das ist {{c1::' },
      { type: 'text', text: 'fett', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' gedruckt}} hier' },
    ])
    const answer = renderClozeDoc(d, 1, 'answer')
    expect(docToText(answer)).toBe('Das ist fett gedruckt hier')
    const para = (answer.content as { content: { text: string; marks?: { type: string }[] }[] }[])[0]!
    const bold = para.content.find((n) => n.text === 'fett')!
    expect(bold.marks?.map((m) => m.type)).toEqual(['bold', 'cloze'])
  })
})
