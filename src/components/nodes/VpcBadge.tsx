import { memo } from 'react'
import { groupStyle } from '../../data/groups'

const MIN_FONT_SIZE = 9
const ICON_FRACTION = 0.14
/** Share of the pill's height hanging past the icon's corner. Stays inside the image export's padding at the largest icon. */
const OVERHANG = 0.3

/**
 * Sits on the icon's top-right corner and scales with it, with a floor so it stays readable on
 * small icons. It never reaches the label below the icon, and ignores the pointer so the corner's
 * resize and connection handles keep working.
 */
function VpcBadgeComponent({ iconSize }: { iconSize: number }) {
  const fontSize = Math.max(MIN_FONT_SIZE, Math.round(iconSize * ICON_FRACTION))
  const height = Math.round(fontSize * 1.5)
  const offset = -Math.round(height * OVERHANG)

  return (
    <div
      role="img"
      aria-label="VPC badge"
      className="font-diagram pointer-events-none absolute flex items-center rounded-full font-bold text-white select-none"
      style={{
        top: offset,
        right: offset,
        height,
        fontSize,
        lineHeight: 1,
        paddingInline: Math.round(fontSize * 0.5),
        backgroundColor: groupStyle('vpc').stroke,
        // A white edge keeps the pill distinct over icons of a similar colour.
        boxShadow: `0 0 0 ${Math.max(1, Math.round(fontSize * 0.1))}px #ffffff`,
      }}
    >
      VPC
    </div>
  )
}

export const VpcBadge = memo(VpcBadgeComponent)
