import type { CSSProperties } from 'react'
import type { AwsEdgeData, TextFormatting } from '../types'

export const DEFAULT_ARROW_COLOR = '#545b64'
export const DEFAULT_ARROW_WIDTH = 1.5
export const MIN_ARROW_WIDTH = 0.5
export const MAX_ARROW_WIDTH = 12
export const DEFAULT_TEXT_COLOR = '#18181b'
export const DEFAULT_EDGE_TEXT_COLOR = '#3f3f46'

/** Only plain hex colours enter saved data, CSS and export styles. Expand shorthand for pickers. */
export function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const color = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(color)) return color
  if (/^#[0-9a-f]{3}$/.test(color)) return `#${[...color.slice(1)].map((digit) => digit + digit).join('')}`
  return undefined
}

export const validArrowWidth = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= MIN_ARROW_WIDTH && value <= MAX_ARROW_WIDTH

export function arrowAppearance(data?: Partial<AwsEdgeData>) {
  return {
    color: normalizeColor(data?.strokeColor) ?? DEFAULT_ARROW_COLOR,
    width: validArrowWidth(data?.strokeWidth) ? data.strokeWidth : DEFAULT_ARROW_WIDTH,
  }
}

export function parseTextFormatting(data: Record<string, unknown>): TextFormatting {
  const textColor = normalizeColor(data.textColor)
  return {
    ...(typeof data.bold === 'boolean' && { bold: data.bold }),
    ...(typeof data.underline === 'boolean' && { underline: data.underline }),
    ...(textColor && { textColor }),
  }
}

export function textAppearance(data?: TextFormatting, fallback = DEFAULT_TEXT_COLOR): CSSProperties {
  return {
    color: normalizeColor(data?.textColor) ?? fallback,
    fontWeight: data?.bold === true ? 700 : 400,
    textDecoration: data?.underline === true ? 'underline' : 'none',
  }
}

/** Room for thick, rounded strokes on every side of the open arrowhead. */
export function arrowheadGeometry(width: number) {
  const length = Math.max(8, width * 2.5)
  const padding = width / 2 + 1
  const size = length + padding * 2
  return {
    size, refX: padding + length, refY: padding + length / 2,
    path: `M${padding},${padding} L${padding + length},${padding + length / 2} L${padding},${padding + length}`,
  }
}
