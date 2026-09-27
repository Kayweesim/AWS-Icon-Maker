/** Room codes and the `/ABCD` URLs they live at. Pure: no Liveblocks, no DOM. */

import { DISPLAY_NAME_KEY, PRESENCE_COLOURS, ROOM_ID_PREFIX } from './config'

/** I and O are left out: they read as 1 and 0 when someone types a code from a screenshot. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export const ROOM_CODE_LENGTH = 4

/** A four-letter code, e.g. `ABCD`. */
export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

/** Accepts what someone types or pastes (`abcd`, ` ABCD `, a full URL) or returns null. */
export function normaliseRoomCode(input: string): string | null {
  const last = input.trim().split('/').pop() ?? ''
  const code = last.trim().toUpperCase()
  if (code.length !== ROOM_CODE_LENGTH) return null
  return [...code].every((letter) => ALPHABET.includes(letter)) ? code : null
}

/** The room code in a path like `/ABCD`, or null for any other path. */
export function roomCodeFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length === 1 ? normaliseRoomCode(segments[0]) : null
}

export const roomPath = (code: string) => `/${code}`

/** The Liveblocks room id behind a code. */
export const roomId = (code: string) => `${ROOM_ID_PREFIX}${code}`

/** Stable colour for a name, so everyone sees the same person in the same colour. */
export function presenceColour(name: string): string {
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) % 1_000_003
  return PRESENCE_COLOURS[hash % PRESENCE_COLOURS.length]
}

/** Compact label used by collaborator avatars. */
export function presenceInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

/** The name shown to others, remembered between visits. */
export function loadDisplayName(): string {
  try {
    const saved = localStorage.getItem(DISPLAY_NAME_KEY)
    if (saved?.trim()) return saved.trim().slice(0, 24)
  } catch {
    // Private mode: fall through to a fresh name.
  }
  return `Guest ${Math.floor(Math.random() * 90) + 10}`
}

export function saveDisplayName(name: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name)
  } catch {
    // Best-effort, same as autosave.
  }
}
