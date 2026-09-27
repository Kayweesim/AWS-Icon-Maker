import { HANDLE_SPACING } from './config'

export type HandleSide = 'top' | 'right' | 'bottom' | 'left'

export const HANDLE_SIDES: HandleSide[] = ['top', 'right', 'bottom', 'left']

const HANDLE_PATTERN = /^(top|right|bottom|left)(?:-(\d+(?:\.\d+)?))?$/

/** Handle ids: the bare side name for the middle point, and "side-<percent>" for the others. */
export const handleId = (side: HandleSide, percent: number) => (percent === 50 ? side : `${side}-${percent}`)

/** The side a handle sits on and how far along it (0–1), or null if the id isn't a handle. */
export function parseHandle(id: string | null | undefined): { side: HandleSide; fraction: number } | null {
  const match = HANDLE_PATTERN.exec(id ?? '')
  if (!match) return null
  const fraction = match[2] === undefined ? 0.5 : Math.round(Number(match[2]) * 10) / 1000
  return { side: match[1] as HandleSide, fraction }
}

/**
 * Connection points along one side of a node, evenly spaced and roughly HANDLE_SPACING apart.
 * Always an odd number, so one point sits in the middle, and at most 9 so they stay apart.
 */
export function handlePercents(length: number): number[] {
  const gaps = Math.round(Math.max(0, length) / HANDLE_SPACING) - 1
  // Round up to an odd number, so one point lands in the middle.
  const count = Math.min(9, gaps <= 1 ? 1 : gaps % 2 ? gaps : gaps + 1)
  return Array.from({ length: count }, (_, i) => Math.round(((i + 1) / (count + 1)) * 1000) / 10)
}
