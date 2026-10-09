import { emptyDraft, newChoice, type CardDraft } from '@/features/cards/model'
import { createCard } from '@/features/cards/repo'
import { textToDoc } from '@/features/cards/richtext'
import { createDeck, createFolder } from '@/features/library/repo'

const doc = textToDoc

/** Beispiel-Ordner mit allen Kartentypen – zum Ausprobieren und Löschen. */
export async function createSampleContent() {
  const folder = await createFolder({ name: 'Beispiel: IHK-Prüfung', color: 'green', icon: '🎓', parentId: null })
  const net = await createDeck({ name: 'Netzwerk-Grundlagen', description: 'OSI-Modell, Protokolle und Ports', color: 'cyan', icon: '🌐', folderId: folder.id })
  const wiso = await createDeck({ name: 'WiSo', description: 'Wirtschafts- und Sozialkunde', color: 'amber', icon: '💶', folderId: folder.id })

  const netCards: CardDraft[] = [
    { ...emptyDraft('basic', ['osi']), front: doc('Welche Aufgabe hat Schicht 3 (Vermittlungsschicht) im OSI-Modell?'), back: doc('Routing: Wegfindung und Weiterleitung von Paketen zwischen Netzen anhand logischer Adressen (IP).'), notes: 'Router arbeiten auf Schicht 3.' },
    { ...emptyDraft('cloze', ['protokolle']), front: doc('TCP ist {{c1::verbindungsorientiert}}, UDP ist {{c2::verbindungslos}}.'), back: doc('Deshalb nutzt z. B. Video-Streaming oft UDP.') },
    {
      ...emptyDraft('choice', ['protokolle']),
      front: doc('Welche Protokolle arbeiten auf der Transportschicht (Schicht 4)?'),
      choices: [newChoice('TCP', true), newChoice('IP'), newChoice('UDP', true), newChoice('HTTP')],
      back: doc('IP liegt auf Schicht 3, HTTP auf Schicht 7.'),
    },
    { ...emptyDraft('input', ['ports']), front: doc('Welchen Standard-Port verwendet HTTPS?'), back: doc('443') },
    { ...emptyDraft('reversible', ['abkürzungen']), front: doc('DHCP'), back: doc('Dynamic Host Configuration Protocol – vergibt IP-Adressen automatisch') },
    {
      ...emptyDraft('basic', ['osi']),
      front: doc('Nenne die 7 Schichten des OSI-Modells (von unten).'),
      back: doc('1 Bitübertragung\n2 Sicherung\n3 Vermittlung\n4 Transport\n5 Sitzung\n6 Darstellung\n7 Anwendung'),
      notes: '„Alle deutschen Studenten trinken verschiedene Sorten Bier“ (von oben nach unten)',
      hint: 'Fängt mit „Bit…“ an',
    },
  ]
  const wisoCards: CardDraft[] = [
    { ...emptyDraft('basic', ['arbeitsrecht']), front: doc('Wie lang darf die Probezeit in der Ausbildung höchstens sein?'), back: doc('Mindestens 1, höchstens 4 Monate (§ 20 BBiG).') },
    { ...emptyDraft('cloze', ['arbeitsrecht']), front: doc('Jugendliche unter 18 haben Anspruch auf mindestens {{c1::25}} Werktage Urlaub, wenn sie zu Beginn des Jahres noch nicht {{c2::17}} sind.') },
    {
      ...emptyDraft('choice', ['sozialversicherung']),
      front: doc('Welche Sozialversicherung zahlt der Arbeitgeber allein?'),
      choices: [newChoice('Krankenversicherung'), newChoice('Unfallversicherung', true), newChoice('Rentenversicherung'), newChoice('Pflegeversicherung')],
    },
  ]

  for (const c of netCards) await createCard(net.id, c)
  for (const c of wisoCards) await createCard(wiso.id, c)
  return { folderId: folder.id, cards: netCards.length + wisoCards.length }
}
