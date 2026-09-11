import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react'
import { memo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import type { AppEdge } from '../../types'
import { EditableLabel } from '../common/EditableLabel'

const STROKE = '#545B64'
const SELECTED = '#3B82F6'

function buildPath(props: EdgeProps<AppEdge>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props
  const params = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }
  switch (data?.pathType) {
    case 'straight':
      return getStraightPath(params)
    case 'bezier':
      return getBezierPath(params)
    default:
      // AWS guidelines favour straight lines and right angles.
      return getSmoothStepPath({ ...params, borderRadius: 6, offset: 20 })
  }
}

function AwsEdgeComponent(props: EdgeProps<AppEdge>) {
  const { id, data, selected } = props
  const editing = useDiagramStore((s) => s.editingId === id)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateEdgeData = useDiagramStore((s) => s.updateEdgeData)

  const [path, labelX, labelY] = buildPath(props)
  const color = selected ? SELECTED : STROKE
  const arrows = data?.arrows ?? 'end'
  const markerId = `arrow-${id}`

  return (
    <>
      <defs>
        {/* Open arrowhead, matching the AWS preset arrows. */}
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M2,2 L10,6 L2,10" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={16}
        markerEnd={arrows !== 'none' ? `url(#${markerId})` : undefined}
        markerStart={arrows === 'both' ? `url(#${markerId})` : undefined}
        style={{ stroke: color, strokeWidth: 1.5, strokeDasharray: data?.dashed ? '6 4' : undefined }}
      />
      {(data?.label || editing) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
            onDoubleClick={() => setEditingId(id)}
          >
            <EditableLabel
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
