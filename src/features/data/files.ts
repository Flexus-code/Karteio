/** Datei über das Teilen-Menü (iOS: „In Dateien sichern“, AirDrop, Mail …) oder als Download ausgeben. */
export async function shareOrDownload(filename: string, content: Blob | string, type = 'application/json'): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const file = new File([blob], filename, { type })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // sonst: auf Download ausweichen
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

/** Öffnet die Dateiauswahl und liefert die gewählte Datei (oder `null` bei Abbruch). */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    // Abbruch erkennen (nicht in allen Browsern zuverlässig)
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** Dateiname ohne problematische Zeichen */
export function safeFilename(name: string) {
  return (
    name
      .normalize('NFKD')
      .replace(/[^\w\s.-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'karteio'
  )
}

export function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10)
}
