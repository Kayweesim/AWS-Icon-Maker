import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { COLLAB_ENABLED } from './config'
import {
  generateRoomCode,
  loadDisplayName,
  normaliseRoomCode,
  presenceColour,
  roomCodeFromPath,
  roomId,
  roomPath,
  saveDisplayName,
} from './room'
import { startSync } from './sync'

export type Collaboration = ReturnType<typeof useCollaboration>

/** Keeps the room in step with the `/ABCD` URL, and exposes what the Share menu needs. */
export function useCollaboration() {
  const [code, setCode] = useState(() => roomCodeFromPath(window.location.pathname))
  const [name, setName] = useState(loadDisplayName)
  // The middleware only sets a status once a room is entered.
  const status = useDiagramStore((s) => s.liveblocks.status ?? 'initial')
  const others = useDiagramStore((s) => s.liveblocks.others)
  const setPresence = useDiagramStore((s) => s.setPresence)

  // The browser's back and forward buttons move between rooms like any other page.
  useEffect(() => {
    const onPopState = () => setCode(roomCodeFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => setPresence({ name, colour: presenceColour(name) }), [name, setPresence])

  useEffect(() => {
    if (!COLLAB_ENABLED || !code) return
    const sync = startSync()
    // Seed the room with what's on screen; if the room already has a diagram, it wins instead.
    sync.flush()
    useDiagramStore.getState().liveblocks.enterRoom(roomId(code))
    return () => {
      useDiagramStore.getState().liveblocks.leaveRoom()
      sync.stop()
      setPresence({ cursor: null })
    }
  }, [code, setPresence])

  const go = useCallback((next: string | null) => {
    window.history.pushState({}, '', next ? roomPath(next) : '/')
    setCode(next)
  }, [])

  const rename = useCallback((value: string) => {
    const trimmed = value.slice(0, 24)
    setName(trimmed)
    saveDisplayName(trimmed)
  }, [])

  return useMemo(
    () => ({
      enabled: COLLAB_ENABLED,
      code,
      status,
      others,
      name,
      rename,
      /** Creates a room from the current diagram and moves to its URL. */
      start: () => go(generateRoomCode()),
      /** Joins a room from a typed code or a pasted link. Returns false if the code is malformed. */
      join: (input: string) => {
        const next = normaliseRoomCode(input)
        if (next) go(next)
        return next !== null
      },
      leave: () => go(null),
    }),
    [code, status, others, name, rename, go],
  )
}
