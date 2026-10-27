import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
  type EdgeProps,
} from '@xyflow/react'
import { memo } from 'react'
import { elbowRoute } from '../../lib/elbowRoute'
import { parallelEdgeOffsets } from '../../lib/parallelEdges'
import { useDiagramStore } from '../../store/diagramStore'
import type { AppEdge } from '../../types'
import { EditableLabel } from '../common/EditableLabel'
import { ElbowHandles } from './ElbowHandles'
import { arrowAppearance, arrowheadGeometry, DEFAULT_EDGE_TEXT_COLOR } from '../../lib/appearance'

const SELECTED = '#3B82F6'

/** Slides an end point along the side of its node (down for left/right sides, right for top/bottom). */
const slide = (x: number, y: number, side: Position, offset: number) =>
  side === Position.Left || side === Position.Right ? { x, y: y + offset } : { x: x + offset, y }

function buildPath(props: EdgeProps<AppEdge>, offset: number) {
  const { sourcePosition, targetPosition, data } = props
  // Arrows sharing both end points are offset so they run side by side (see parallelEdgeOffsets).
  const source = slide(props.sourceX, props.sourceY, sourcePosition, offset)
  const target = slide(props.targetX, props.targetY, targetPosition, offset)
  const params = { sourceX: source.x, sourceY: source.y, targetX: target.x, targetY: target.y, sourcePosition, targetPosition }
  switch (data?.pathType) {
    case 'straight':
      return { path: getStraightPath(params), route: null }
    case 'bezier':
      return { path: getBezierPath(params), route: null }
    default: {
      // AWS guidelines favour straight lines and right angles.
      if (!props.selected && !data?.elbowOffsets) {
        return { path: getSmoothStepPath({ ...params, borderRadius: 6, offset: 20 }), route: null }
      }
      const route = elbowRoute(params, data?.elbowOffsets)
      const path = data?.elbowOffsets
        ? [route.path, route.label.x, route.label.y] as const
        : getSmoothStepPath({ ...params, borderRadius: 6, offset: 20 })
      return { path, route }
    }
  }
}

function AwsEdgeComponent(props: EdgeProps<AppEdge>) {
  const { id, data, selected } = props
  const editing = useDiagramStore((s) => s.editingId === id)
  const selecting = useDiagramStore((s) => s.tool.kind === 'select')
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData)
  const offset = useDiagramStore((s) => parallelEdgeOffsets(s.edges).get(id) ?? 0)

  const { path: [path, labelX, labelY], route } = buildPath(props, offset)
  const { color, width } = arrowAppearance(data)
  const head = arrowheadGeometry(width)
  const arrows = data?.arrows ?? 'end'
  const markerId = `arrow-${id}`

  return (
    <>
      <defs>
        {/* Open arrowhead, matching the AWS preset arrows. */}
        <marker
          id={markerId}
          viewBox={`0 0 ${head.size} ${head.size}`}
          refX={head.refX}
          refY={head.refY}
          markerWidth={head.size}
          markerHeight={head.size}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d={head.path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {/* A separate selection halo leaves the chosen colour visible while it is being edited. */}
      {selected && <path className="edge-selection-outline" d={path} fill="none" stroke={SELECTED} strokeWidth={width + 6} strokeOpacity={0.25} pointerEvents="none" />}
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={Math.max(16, width + 10)}
        markerEnd={arrows !== 'none' ? `url(#${markerId})` : undefined}
        markerStart={arrows === 'both' ? `url(#${markerId})` : undefined}
        style={{ stroke: color, strokeWidth: width, strokeDasharray: data?.dashed ? `${Math.max(6, width * 3)} ${Math.max(4, width * 2)}` : undefined }}
      />
      {selected && selecting && !editing && route && <ElbowHandles id={id} handles={route.handles} offsets={route.offsets} />}
      {(data?.label || editing) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - (selected && route ? 18 : 0)}px)`, pointerEvents: 'all' }}
            onDoubleClick={() => setEditingId(id)}
          >
            <EditableLabel
              formatting={data}
              style={{ color: DEFAULT_EDGE_TEXT_COLOR }}
              value={data?.label ?? ''}
              editing={editing}
              placeholder="Label"
              onCommit={(label) => updateEdgeData(id, { label })}
              onDone={() => setEditingId(null)}
              className={`font-diagram block max-w-48 bg-white px-1.5 py-0.5 text-center text-[11px] leading-snug whitespace-pre-wrap text-zinc-700 ${
                editing ? 'w-40' : `rounded ${selected ? 'text-blue-600' : ''}`
              }`}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const AwsEdge = memo(AwsEdgeComponent)
