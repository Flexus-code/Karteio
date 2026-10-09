import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Fängt Abstürze ab und zeigt eine freundliche Meldung statt eines weißen Bildschirms.
 * Die Daten liegen in IndexedDB und bleiben erhalten; Entwürfe im Editor sind zwischengespeichert.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Karteio-Fehler:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg px-8 text-center text-ink">
        <div className="text-[56px]">🙈</div>
        <h1 className="text-[22px] font-bold">Hoppla, da ist etwas schiefgelaufen</h1>
        <p className="max-w-[300px] text-[15px] leading-relaxed text-ink-2">
          Keine Sorge – deine Karten sind sicher gespeichert. Starte die App neu, dann geht es weiter.
        </p>
        <button
          onClick={() => {
            location.hash = '#/'
            location.reload()
          }}
          className="mt-2 min-h-12 rounded-2xl bg-accent px-6 text-[16px] font-semibold text-white"
        >
          App neu laden
        </button>
        <details className="mt-4 max-w-full text-left text-[12px] text-ink-3">
          <summary>Technische Details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
        </details>
      </div>
    )
  }
}
