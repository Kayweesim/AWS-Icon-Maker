import { EdgeLabelRenderer, useReactFlow, useStore } from '@xyflow/react'
import { useEffect, useRef, type PointerEvent } from 'react'
import type { ElbowHandle } from '../../lib/elbowRoute'
import { useDiagramStore } from '../../store/diagramStore'
import { GRID_SIZE } from '../../types'

type Drag = { pointerId: number; handle: ElbowHandle; start: number; offsets: number[]; original?: number[]; moved: boolean }

export function ElbowHandles({ id, handles, offsets }: { id: string; handles: ElbowHandle[]; offsets: number[] }) {
  const { screenToFlowPosition } = useReactFlow()
  const zoom = useStore((state) => state.transform[2])
  const drag = useRef<Drag | null>(null)
  const update = useDiagramStore((state) => state.updateEdgeData)
  const begin = useDiagramStore((state) => state.beginHistoryBatch)
  const end = useDiagramStore((state) => state.endHistoryBatch)

  useEffect(() => () => { if (drag.current) { drag.current = null; end() } }, [end])

  const finish = () => {
    if (!drag.current) return
    drag.current = null
    end()
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    event.stopPropagation()
    const { axis, index } = current.handle
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY }, { snapToGrid: false })
    const delta = point[axis] - current.start
    if (!delta && !current.moved) return
    current.moved = true
    const next = [...current.offsets]
    next[index] += delta
    update(id, { elbowOffsets: delta ? next : current.original })
  }

  return (
    <EdgeLabelRenderer>
      {handles.map((handle) => (
        <button
          key={handle.index}
          type="button"
          className="nodrag nopan nowheel edge-elbow-handle absolute flex h-6 w-6 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-blue-500"
          aria-label={`Move arrow segment ${handle.index + 1} ${handle.axis === 'x' ? 'horizontally' : 'vertically'}`}
          title="Drag to adjust this elbow. Arrow keys to nudge. Double-click to reset."
          style={{
            pointerEvents: 'all', touchAction: 'none', cursor: handle.axis === 'x' ? 'ew-resize' : 'ns-resize',
            transform: `translate(${handle.position.x}px, ${handle.position.y}px) scale(${1 / zoom}) translate(-50%, -50%)`,
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.stopPropagation()
            event.preventDefault()
            event.currentTarget.focus()
            const point = screenToFlowPosition({ x: event.clientX, y: event.clientY }, { snapToGrid: false })
            begin()
            const original = useDiagramStore.getState().edges.find((edge) => edge.id === id)?.data?.elbowOffsets
            drag.current = { pointerId: event.pointerId, handle, start: point[handle.axis], offsets: [...offsets], original, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={move}
          onPointerUp={(event) => { move(event); finish() }}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => { event.stopPropagation(); update(id, { elbowOffsets: undefined }) }}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
            event.preventDefault()
            event.stopPropagation()
            const negative = handle.axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
            const positive = handle.axis === 'x' ? 'ArrowRight' : 'ArrowDown'
            if (event.key !== negative && event.key !== positive) return
            const next = [...offsets]
            next[handle.index] += (event.key === negative ? -1 : 1) * GRID_SIZE * (event.shiftKey ? 2 : 1)
            update(id, { elbowOffsets: next })
          }}
        >
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-blue-500 bg-white shadow-sm" />
        </button>
      ))}
    </EdgeLabelRenderer>
  )
}
