import { createClient } from '@liveblocks/client'
import { LIVEBLOCKS_PUBLIC_KEY, SYNC_THROTTLE_MS } from './config'

/** What each person broadcasts about themselves; small and sent often. */
export type UserPresence = {
  name: string
  colour: string
  /** Pointer position in canvas coordinates, or null when the pointer left the canvas. */
  cursor: { x: number; y: number } | null
  /** Which page this person is looking at, so tabs can show who is where. */
  pageId: string | null
  /** Selected nodes, broadcast separately from the saved/shared diagram. Optional for older clients. */
  selectedNodeIds?: string[]
}

/** The Zustand middleware maps the store's `presence` field into this room-presence wrapper. */
export type RoomPresence = {
  presence: UserPresence
}

export const presenceOf = (roomPresence: RoomPresence) => roomPresence.presence

declare global {
  interface Liveblocks {
    Presence: RoomPresence
  }
}

/** Null when no Liveblocks key is configured: the app then runs entirely offline. */
export const collabClient = LIVEBLOCKS_PUBLIC_KEY
  ? createClient({ publicApiKey: LIVEBLOCKS_PUBLIC_KEY, throttle: SYNC_THROTTLE_MS })
  : null
