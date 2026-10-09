import { useCallback, useRef } from 'react'

/**
 * Long-Press für Touch und Maus. Bewegt sich der Finger (Scrollen), wird abgebrochen.
 * Gibt Handler zurück, die auf das Element gespreadet werden; `wasLongPress()` verhindert den Klick danach.
 */
export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      clear()
      timer.current = setTimeout(() => {
        fired.current = true
        onLongPress()
      }, delay)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      if (!fired.current) {
        clear()
        fired.current = true
        onLongPress()
      }
    },
  }

  return { handlers, wasLongPress: () => fired.current }
}
