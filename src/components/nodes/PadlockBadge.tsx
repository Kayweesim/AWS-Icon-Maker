import { memo } from 'react'

const COLOR = '#ff2d20'
const MIN_SIZE = 14
const ICON_FRACTION = 0.3
/** Share of the badge hanging past the icon's corner. Stays inside the image export's padding at the largest icon. */
const OVERHANG = 0.25

const BODY = { x: 4.5, y: 10.5, width: 15, height: 11, rx: 2.5 }
const SHACKLE = 'M8 10.5V7.5a4 4 0 0 1 8 0v3'

/**
 * Sits on the icon's top-right corner and scales with it, with a floor so it stays readable on
 * small icons. It never reaches the label below the icon, and ignores the pointer so the corner's
 * resize and connection handles keep working. Colours are explicit so image export reproduces them.
 */
function PadlockBadgeComponent({ iconSize }: { iconSize: number }) {
  const size = Math.max(MIN_SIZE, Math.round(iconSize * ICON_FRACTION))
  const offset = -Math.round(size * OVERHANG)

  return (
    <svg
      role="img"
      aria-label="Padlock badge"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="pointer-events-none absolute block"
      style={{ top: offset, right: offset }}
    >
      {/* A white halo keeps the padlock legible over icons of a similar colour. */}
      <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
        <path d={SHACKLE} strokeWidth={5.5} />
        <rect {...BODY} strokeWidth={3} fill="#ffffff" />
      </g>
      <path d={SHACKLE} fill="none" stroke={COLOR} strokeWidth={2.5} strokeLinecap="round" />
      <rect {...BODY} fill={COLOR} />
    </svg>
  )
}

export const PadlockBadge = memo(PadlockBadgeComponent)
