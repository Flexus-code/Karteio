import { describe, expect, it } from 'vitest'
import { splitQuestionAnswer, tidyTranscript } from './useSpeech'

describe('Spracheingabe', () => {
  it('setzt Fragezeichen bei W-Fragen und schreibt groß', () => {
    expect(tidyTranscript('was ist ein router', 'question')).toBe('Was ist ein router?')
    expect(tidyTranscript('nenne drei schichten', 'question')).toBe('Nenne drei schichten')
    expect(tidyTranscript('osi modell', 'question')).toBe('Osi modell')
    expect(tidyTranscript('verbindet netzwerke', 'answer')).toBe('Verbindet netzwerke')
  })

  it('teilt Frage und Antwort am Wort „Antwort“', () => {
    expect(splitQuestionAnswer('was ist ein router antwort verbindet netzwerke')).toEqual({
      question: 'Was ist ein router?',
      answer: 'Verbindet netzwerke',
    })
    expect(splitQuestionAnswer('Port von HTTPS Lösung 443')).toEqual({ question: 'Port von HTTPS', answer: '443' })
    expect(splitQuestionAnswer('nur eine frage')).toBeNull()
  })
})
