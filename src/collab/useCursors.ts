import type { XYPosition } from '@xyflow/react'
import { useCallback, useMemo, useRef } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { CURSOR_THROTTLE_MS } from './config'

/**
 * Broadcasts this user's pointer to the room. The position is passed as a getter so the screen →
 * canvas conversion is skipped on the frames that are throttled away.
 */
export function useCursorBroadcast() {
  const setPresence = useDiagramStore((s) => s.setPresence)
  const inRoom = useDiagramStore((s) => s.liveblocks.room !== null)
  const sentAt = useRef(0)

  const move = useCallback(
    (point: () => XYPosition) => {
      if (!inRoom) return
      const now = performance.now()
      if (now - sentAt.current < CURSOR_THROTTLE_MS) return
      sentAt.current = now
      const { x, y } = point()
      setPresence({ cursor: { x: Math.round(x), y: Math.round(y) } })
    },
    [inRoom, setPresence],
  )

  const leave = useCallback(() => {
    if (!inRoom) return
    sentAt.current = 0
    setPresence({ cursor: null })
  }, [inRoom, setPresence])

  return useMemo(() => ({ move, leave }), [move, leave])
}
