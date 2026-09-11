import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
  type XYPosition,
} from '@xyflow/react'
import { useState, type DragEvent, type MouseEvent } from 'react'
import { groupStyle } from '../../data/groups'
import { setCanvasPointer } from '../../lib/pointer'
import { useDiagramStore } from '../../store/diagramStore'
import { DRAG_MIME, GRID_SIZE, type AppNode, type PaletteDragItem } from '../../types'
import { AwsEdge } from '../edges/AwsEdge'
import { GroupNode } from '../nodes/GroupNode'
import { IconNode } from '../nodes/IconNode'
import { TextNode } from '../nodes/TextNode'
import { ArrowPreview } from './ArrowPreview'

const nodeTypes: NodeTypes = { icon: IconNode, awsGroup: GroupNode, text: TextNode }
const edgeTypes: EdgeTypes = { aws: AwsEdge }
const connectionLineStyle = { stroke: '#3B82F6', strokeWidth: 1.5 }
const multiSelectKeys = ['Meta', 'Control', 'Shift']
// Left-drag on empty canvas draws a selection box; middle/right-drag (or Space+drag) pans.
const panButtons = [1, 2]

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

const minimapColor = (node: AppNode) => (node.type === 'icon' ? '#d4d4d8' : 'transparent')
const minimapStroke = (node: AppNode) => (node.type === 'awsGroup' ? groupStyle(node.data.groupType).stroke : 'transparent')

export function DiagramCanvas() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const tool = useDiagramStore((s) => s.tool)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const onConnect = useDiagramStore((s) => s.onConnect)
  const addIconNode = useDiagramStore((s) => s.addIconNode)
  const addGroupNode = useDiagramStore((s) => s.addGroupNode)
  const addTextNode = useDiagramStore((s) => s.addTextNode)
  const arrowModeClick = useDiagramStore((s) => s.arrowModeClick)
  const cancelTool = useDiagramStore((s) => s.cancelTool)
  const closeQuickAdd = useDiagramStore((s) => s.closeQuickAdd)
  const reparentNodes = useDiagramStore((s) => s.reparentNodes)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const beginHistoryBatch = useDiagramStore((s) => s.beginHistoryBatch)
  const endHistoryBatch = useDiagramStore((s) => s.endHistoryBatch)
  const { screenToFlowPosition } = useReactFlow()
  const [pointer, setPointer] = useState<XYPosition | null>(null)

  const selecting = tool.kind === 'select'
  const flowPoint = (event: MouseEvent) => screenToFlowPosition({ x: event.clientX, y: event.clientY })

  const stopEditingUnless = (id: string | null) => {
    const editingId = useDiagramStore.getState().editingId
    if (editingId && editingId !== id) setEditingId(null)
  }

  const onDragStop = (dragged: AppNode[]) => {
    reparentNodes(dragged.map((n) => n.id))
    endHistoryBatch()
  }

  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes(DRAG_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (event: DragEvent) => {
    const raw = event.dataTransfer.getData(DRAG_MIME)
    if (!raw) return
    event.preventDefault()
    const item = JSON.parse(raw) as PaletteDragItem
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    if (item.kind === 'group') {
      // Drop groups with their top-left corner just above-left of the cursor.
      addGroupNode(item.groupType, { x: snap(point.x - 16), y: snap(point.y - 16) })
    } else {
      // The store centres the icon on the cursor.
      addIconNode(item, point)
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    // Quick add (S) opens at the cursor.
    setCanvasPointer({ x: event.clientX, y: event.clientY })
    if (tool.kind === 'arrow') setPointer(flowPoint(event))
  }

  const onPaneClick = (event: MouseEvent) => {
    if (tool.kind === 'text') return addTextNode(flowPoint(event))
    if (tool.kind === 'arrow') return cancelTool()
    // The pane swallows mousedown, so an open label editor never blurs; close it explicitly.
    stopEditingUnless(null)
  }

  const onNodeClick = (event: MouseEvent, node: AppNode) => {
    if (tool.kind === 'arrow') return arrowModeClick(node.id, { keepGoing: event.shiftKey })
    // Text can go inside groups and next to services.
    if (tool.kind === 'text') return addTextNode(flowPoint(event))
    stopEditingUnless(node.id)
  }

  return (
    <ReactFlow
      className={tool.kind === 'arrow' ? 'tool-arrow' : tool.kind === 'text' ? 'tool-text' : undefined}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setCanvasPointer(null)}
      // Quick add is anchored to a screen point, so close it when the view or nodes move.
      onMoveStart={() => closeQuickAdd()}
      onNodeDragStart={() => {
        closeQuickAdd()
        beginHistoryBatch()
      }}
      onNodeDragStop={(_, __, dragged) => onDragStop(dragged)}
      onSelectionDragStart={beginHistoryBatch}
      onSelectionDragStop={(_, dragged) => onDragStop(dragged)}
      onNodeDoubleClick={(_, node) => selecting && setEditingId(node.id)}
      onEdgeDoubleClick={(_, edge) => selecting && setEditingId(edge.id)}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeClick}
      onEdgeClick={(_, edge) => selecting && stopEditingUnless(edge.id)}
      connectionMode={ConnectionMode.Loose}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionLineStyle={connectionLineStyle}
      // Releasing a dragged connection anywhere near a handle still connects.
      connectionRadius={40}
      nodesDraggable={selecting}
      selectionOnDrag={selecting}
      selectionMode={SelectionMode.Partial}
      panOnDrag={panButtons}
      panOnScroll
      multiSelectionKeyCode={multiSelectKeys}
      snapToGrid
      snapGrid={[GRID_SIZE, GRID_SIZE]}
      zoomOnDoubleClick={false}
      // Arrow keys are handled by useKeyboardShortcuts so nudges are undoable and re-nest nodes.
      disableKeyboardA11y
      minZoom={0.1}
      maxZoom={4}
      deleteKeyCode={null}
    >
      <Background variant={BackgroundVariant.Dots} gap={GRID_SIZE * 3} size={1.2} color="#d4d4d8" />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap<AppNode>
        pannable
        zoomable
        position="bottom-right"
        nodeColor={minimapColor}
        nodeStrokeColor={minimapStroke}
        nodeStrokeWidth={3}
        maskColor="rgb(244 244 245 / 0.7)"
      />
      {tool.kind === 'arrow' && tool.sourceId && pointer && (
        <ArrowPreview sourceId={tool.sourceId} pointer={pointer} preset={tool.preset} />
      )}
    </ReactFlow>
  )
}
