/** Collaboration settings. Without a Liveblocks key the app stays single-player. */

const key = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY

/** Public (client-side) Liveblocks key, or null when collaboration isn't configured. */
export const LIVEBLOCKS_PUBLIC_KEY: string | null = typeof key === 'string' && key.startsWith('pk_') ? key : null

export const COLLAB_ENABLED = LIVEBLOCKS_PUBLIC_KEY !== null

/** Liveblocks rooms are global to a project, so the 4-letter code gets a namespace. */
export const ROOM_ID_PREFIX = 'aws-diagram-studio:'

/** Outgoing updates are batched by the Liveblocks client at this interval. */
export const SYNC_THROTTLE_MS = 60

/** Local edits are mirrored into the room this long after the last change. */
export const PUSH_DEBOUNCE_MS = 60

/** Cursor position is sent at most this often. */
export const CURSOR_THROTTLE_MS = 60

export const DISPLAY_NAME_KEY = 'aws-diagram-studio:display-name'

/** Cursor colours, picked by hashing the display name so everyone sees the same one. */
export const PRESENCE_COLOURS = ['#ED7100', '#7AA116', '#00A4A6', '#8C4FFF', '#DD3522', '#147EBA', '#C925D1']
