import { useInternalNode, ViewportPortal, type XYPosition } from '@xyflow/react'
import { arrowPreset, type ArrowPresetId } from '../../data/arrows'
import { LEGACY_ICON_SIZE } from '../../layout/config'

type Props = { sourceId: string; pointer: XYPosition; preset: ArrowPresetId }

/** A line from the arrow's source to the cursor while choosing the target. */
export function ArrowPreview({ sourceId, pointer, preset }: Props) {
  const node = useInternalNode(sourceId)
  if (!node) return null

  const { x, y } = node.internals.positionAbsolute
  const width = node.measured.width ?? 0
  const height = node.measured.height ?? 0
  const iconSize = node.type === 'icon' ? ((node.data as { iconSize?: number }).iconSize ?? LEGACY_ICON_SIZE) : height
  const start = { x: x + width / 2, y: y + (node.type === 'icon' ? iconSize / 2 : height / 2) }
  const { dashed } = arrowPreset(preset).style

  return (
    <ViewportPortal>
      <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden>
        <line
          x1={start.x}
          y1={start.y}
          x2={pointer.x}
          y2={pointer.y}
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeDasharray={dashed ? '6 4' : undefined}
        />
        <circle cx={start.x} cy={start.y} r="4" fill="#3B82F6" />
        <circle cx={pointer.x} cy={pointer.y} r="3" fill="#3B82F6" />
      </svg>
    </ViewportPortal>
  )
}
