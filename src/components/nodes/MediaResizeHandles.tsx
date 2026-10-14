import { useReactFlow, useStore, type XYPosition } from '@xyflow/react'
import { useEffect, useRef, type PointerEvent } from 'react'
import { cornerSize, mediaSize, proportionalSize, type MediaNode, type MediaSize, type ResizeAnchor } from '../../lib/mediaResize'
import { useDiagramStore } from '../../store/diagramStore'

const CORNERS = [
  { name: 'top-left', x: -1, y: -1 }, { name: 'top-right', x: 1, y: -1 },
  { name: 'bottom-left', x: -1, y: 1 }, { name: 'bottom-right', x: 1, y: 1 },
] as const
type Drag = { pointerId: number; pageId: string; start: XYPosition; size: MediaSize; direction: XYPosition; anchor: ResizeAnchor }

export function MediaResizeHandles({ id, kind }: { id: string; kind: MediaNode['type'] }) {
  const { screenToFlowPosition } = useReactFlow()
  const zoom = useStore((state) => state.transform[2])
  const drag = useRef<Drag | null>(null)
  const end = useDiagramStore((state) => state.endHistoryBatch)
  useEffect(() => () => { if (drag.current) { drag.current = null; end() } }, [end])

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current, store = useDiagramStore.getState()
    if (!current || current.pointerId !== event.pointerId || current.pageId !== store.activePageId) return
    event.stopPropagation()
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY }, { snapToGrid: false })
    const size = cornerSize(current.size, { x: point.x - current.start.x, y: point.y - current.start.y }, current.direction, kind)
    store.resizeMedia(id, size, current.anchor)
  }
  const finish = () => {
    const current = drag.current
    if (!current) return
    drag.current = null
    const store = useDiagramStore.getState()
    if (current.pageId === store.activePageId) {
      const node = store.nodes.find((n) => n.id === id)
      if (node && (node.type === 'icon' || node.type === 'image')) {
        const size = mediaSize(node)
        if (size.width !== current.size.width || size.height !== current.size.height) store.reparentNodes([id])
      }
      end()
    }
  }

  return CORNERS.map((corner) => (
    <button
      key={corner.name}
      type="button"
      aria-label={`Resize ${kind} from ${corner.name}`}
      title="Drag to resize proportionally. Arrow keys adjust by 1px; Shift by 10px."
      className="nodrag nopan nowheel media-resize-handle absolute z-10 flex h-6 w-6 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-blue-500"
      style={{
        left: corner.x < 0 ? 0 : '100%', top: corner.y < 0 ? 0 : '100%',
        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
        cursor: corner.x === corner.y ? 'nwse-resize' : 'nesw-resize', touchAction: 'none',
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const store = useDiagramStore.getState(), node = store.nodes.find((n) => n.id === id)
        if (!node || (node.type !== 'image' && node.type !== 'icon')) return
        event.preventDefault(); event.stopPropagation(); event.currentTarget.focus()
        store.beginHistoryBatch()
        store.onNodesChange([{ id, type: 'dimensions', resizing: true }])
        drag.current = {
          pointerId: event.pointerId, pageId: store.activePageId,
          start: screenToFlowPosition({ x: event.clientX, y: event.clientY }, { snapToGrid: false }),
          size: mediaSize(node), direction: corner,
          anchor: { x: corner.x < 0 ? 1 : 0, y: corner.y < 0 ? 1 : 0 },
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={move}
      onPointerUp={(event) => { move(event); finish() }}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
        event.preventDefault(); event.stopPropagation()
        const store = useDiagramStore.getState(), node = store.nodes.find((n) => n.id === id)
        if (!node || (node.type !== 'icon' && node.type !== 'image')) return
        const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'width' : 'height'
        const direction = axis === 'width' ? corner.x : corner.y
        const sign = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
        const size = mediaSize(node)
        store.resizeMedia(id, proportionalSize(size, size[axis] + sign * direction * (event.shiftKey ? 10 : 1), axis, kind),
          { x: corner.x < 0 ? 1 : 0, y: corner.y < 0 ? 1 : 0 })
      }}
    ><span className="h-2 w-2 rounded-[2px] border border-blue-500 bg-white" /></button>
  ))
}
