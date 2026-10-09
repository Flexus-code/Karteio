import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '@/db/db'
import { newId } from '@/lib/id'

const MAX_SIZE = 1600
const QUALITY = 0.82

/** Verkleinert ein Foto (max. 1600 px) und speichert es als JPEG/WebP. */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  const source: CanvasImageSource & { width: number; height: number } = bitmap ?? (await loadImage(file))
  const scale = Math.min(1, MAX_SIZE / Math.max(source.width, source.height))
  const w = Math.round(source.width * scale)
  const h = Math.round(source.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.fillStyle = '#ffffff' // transparente PNGs bekommen weißen Hintergrund
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(source, 0, 0, w, h)
  bitmap?.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  // Falls das Original schon kleiner ist, das Original behalten
  return blob && blob.size < file.size ? blob : file
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

export async function saveImage(file: Blob): Promise<string> {
  const blob = await compressImage(file)
  const id = newId()
  await db.media.add({ id, blob, mimeType: blob.type || 'image/jpeg', createdAt: Date.now() })
  return id
}

/** Object-URL für ein gespeichertes Bild (wird automatisch freigegeben). */
export function useMediaUrl(mediaId: string | undefined): string | undefined {
  const media = useLiveQuery(() => (mediaId ? db.media.get(mediaId) : undefined), [mediaId])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!media) return
    const u = URL.createObjectURL(media.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [media])
  return url
}
