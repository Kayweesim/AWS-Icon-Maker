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
} from '@xyflow/react'
import type { DragEvent } from 'react'
import { groupStyle } from '../../data/groups'
import { useDiagramStore } from '../../store/diagramStore'
import { DRAG_MIME, GRID_SIZE, type AppNode, type PaletteDragItem } from '../../types'
import { AwsEdge } from '../edges/AwsEdge'
import { GroupNode } from '../nodes/GroupNode'
import { IconNode } from '../nodes/IconNode'

const nodeTypes: NodeTypes = { icon: IconNode, awsGroup: GroupNode }
const edgeTypes: EdgeTypes = { aws: AwsEdge }
const connectionLineStyle = { stroke: '#3B82F6', strokeWidth: 1.5 }
const multiSelectKeys = ['Meta', 'Control', 'Shift']
// Left-drag on empty canvas draws a selection box; middle/right-drag (or Space+drag) pans.
const panButtons = [1, 2]

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

const minimapColor = (node: AppNode) => (node.type === 'awsGroup' ? 'transparent' : '#d4d4d8')
const minimapStroke = (node: AppNode) => (node.type === 'awsGroup' ? groupStyle(node.data.groupType).stroke : 'transparent')

export function DiagramCanvas() {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const onConnect = useDiagramStore((s) => s.onConnect)
  const addIconNode = useDiagramStore((s) => s.addIconNode)
  const addGroupNode = useDiagramStore((s) => s.addGroupNode)
  const reparentNodes = useDiagramStore((s) => s.reparentNodes)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const beginHistoryBatch = useDiagramStore((s) => s.beginHistoryBatch)
  const endHistoryBatch = useDiagramStore((s) => s.endHistoryBatch)
  const { screenToFlowPosition } = useReactFlow()

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
      // Centre the 48px icon (inside a 96px-wide node) on the cursor.
      addIconNode(item, { x: snap(point.x - 48), y: snap(point.y - 26) })
    }
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onNodeDragStart={beginHistoryBatch}
      onNodeDragStop={(_, __, dragged) => onDragStop(dragged)}
      onSelectionDragStart={beginHistoryBatch}
      onSelectionDragStop={(_, dragged) => onDragStop(dragged)}
      onNodeDoubleClick={(_, node) => setEditingId(node.id)}
      onEdgeDoubleClick={(_, edge) => setEditingId(edge.id)}
      // The pane swallows mousedown, so an open label editor never blurs; close it explicitly.
      onPaneClick={() => stopEditingUnless(null)}
      onNodeClick={(_, node) => stopEditingUnless(node.id)}
      onEdgeClick={(_, edge) => stopEditingUnless(edge.id)}
      connectionMode={ConnectionMode.Loose}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionLineStyle={connectionLineStyle}
      selectionOnDrag
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
    </ReactFlow>
  )
}
