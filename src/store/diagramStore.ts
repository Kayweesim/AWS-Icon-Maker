import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { create } from 'zustand'
import { groupStyle, type GroupType } from '../data/groups'
import { applyLayoutResult } from '../layout/apply'
import { ICON_SIZE, LAYOUT_ANIMATION_MS } from '../layout/config'
import { iconNodeWidth, iconSizeOf } from '../layout/sizes'
import { isEmptyLayout, type LayoutResult } from '../layout/types'
import { animate, interpolateNodes } from '../lib/animation'
import { cloneClipboard, copySelection, selectionWithDescendants, type ClipboardData } from '../lib/clipboard'
import { absolutePosition, absoluteRect, descendantIds, findParentGroup, nodeSize, sortNodes } from '../lib/geometry'
import { HISTORY_LIMIT, snapshotKey, type Snapshot } from '../lib/history'
import { newId } from '../lib/ids'
import { GRID_SIZE, type AppEdge, type AppNode, type AwsEdgeData } from '../types'

export type DiagramState = {
  name: string
  nodes: AppNode[]
  edges: AppEdge[]
  /** Id of the node or edge whose label is being edited inline. */
  editingId: string | null
  past: Snapshot[]
  future: Snapshot[]
  clipboard: ClipboardData | null

  onNodesChange: (changes: NodeChange<AppNode>[]) => void
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void
  onConnect: (connection: Connection) => void
  addIconNode: (icon: { iconId: string; name: string; path: string }, position: XYPosition) => void
  addGroupNode: (groupType: GroupType, position: XYPosition) => void
  /** Re-evaluates which group each node sits in, e.g. after a drag. */
  reparentNodes: (ids: string[]) => void
  updateNodeData: (id: string, patch: Partial<AppNode['data']>) => void
  updateEdgeData: (id: string, patch: Partial<AwsEdgeData>) => void
  /** Applies the same change to several edges as a single undo step. */
  updateEdgesData: (ids: string[], patch: Partial<AwsEdgeData>) => void
  /** Resizes icons around their centres as a single undo step. */
  setIconSize: (ids: string[], size: number) => void
  setEditingId: (id: string | null) => void

  selectAll: () => void
  clearSelection: () => void
  deleteSelection: () => void
  nudgeSelection: (dx: number, dy: number) => void
  copy: () => void
  cut: () => void
  paste: () => void
  duplicate: () => void

  undo: () => void
  redo: () => void
  /** Call before a continuous interaction (drag, resize) and end it afterwards. */
  beginHistoryBatch: () => void
  endHistoryBatch: () => void

  /** Animates the diagram into a layout computed by Tidy or Auto-arrange, as one undo step. */
  applyLayout: (result: LayoutResult) => void

  setName: (name: string) => void
  /** Clears the canvas as an undoable step. */
  newDiagram: () => void
  /** Replaces the diagram and resets history, e.g. when opening a file. */
  loadDiagram: (diagram: Snapshot & { name?: string }) => void
}

export const DEFAULT_NAME = 'Untitled diagram'

export const DEFAULT_EDGE_DATA: AwsEdgeData = { label: '', dashed: false, pathType: 'step', arrows: 'end' }

const deselectAll = <T extends { selected?: boolean }>(items: T[]) =>
  items.map((item) => (item.selected ? { ...item, selected: false } : item))

/** Places a new node (given in absolute coordinates) inside the innermost group under it. */
function insertNode(nodes: AppNode[], node: AppNode): AppNode[] {
  const rect = { ...node.position, ...nodeSize(node) }
  const parent = findParentGroup(nodes, rect, { wholeRect: node.type === 'awsGroup' })
  if (parent) {
    const parentPos = absolutePosition(parent, new Map(nodes.map((n) => [n.id, n])))
    node = {
      ...node,
      parentId: parent.id,
      position: { x: node.position.x - parentPos.x, y: node.position.y - parentPos.y },
    }
  }
  return sortNodes([...deselectAll(nodes), node])
}

function reparent(nodes: AppNode[], ids: string[]): AppNode[] {
  let changed = false
  for (const id of ids) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const node = byId.get(id)
    // Children dragged along with their parent keep their parent.
    if (!node || (node.parentId && ids.includes(node.parentId))) continue

    const rect = absoluteRect(node, byId)
    const excludeIds = descendantIds(id, nodes).add(id)
    const parent = findParentGroup(nodes, rect, { excludeIds, wholeRect: node.type === 'awsGroup' })
    if (parent?.id === node.parentId) continue

    const parentPos = parent ? absolutePosition(parent, byId) : { x: 0, y: 0 }
    const updated = {
      ...node,
      parentId: parent?.id,
      position: { x: rect.x - parentPos.x, y: rect.y - parentPos.y },
    } as AppNode
    nodes = nodes.map((n) => (n.id === id ? updated : n))
    changed = true
  }
  return changed ? sortNodes(nodes) : nodes
}

// Snapshot taken when a drag or resize begins; committed to history if something changed.
let pendingSnapshot: Snapshot | null = null
let pasteCount = 0
// Jumps a running layout animation to its end state.
let finishLayoutAnimation: (() => void) | null = null

export const useDiagramStore = create<DiagramState>()((set, get) => {
  /** History entries for an edit about to replace the current diagram. */
  const record = (snapshot?: Snapshot) => {
    finishLayoutAnimation?.()
    return {
      past: [...get().past, snapshot ?? { nodes: get().nodes, edges: get().edges }].slice(-HISTORY_LIMIT),
      future: [],
    }
  }

  return {
    name: DEFAULT_NAME,
    nodes: [],
    edges: [],
    editingId: null,
    past: [],
    future: [],
    clipboard: null,

    onNodesChange: (changes) => {
      // Removals are handled by deleteSelection so groups take their contents with them.
      const filtered = changes.filter((c) => c.type !== 'remove')
      set({ nodes: applyNodeChanges(filtered, get().nodes) })
    },

    onEdgesChange: (changes) => {
      const filtered = changes.filter((c) => c.type !== 'remove')
      set({ edges: applyEdgeChanges(filtered, get().edges) })
    },

    onConnect: (connection) => {
      if (connection.source === connection.target) return
      set({
        ...record(),
        edges: addEdge<AppEdge>(
          { ...connection, id: newId('e'), type: 'aws', data: { ...DEFAULT_EDGE_DATA } },
          get().edges,
        ),
      })
    },

    addIconNode: (icon, centre) =>
      set({
        ...record(),
        nodes: insertNode(get().nodes, {
          id: newId('n'),
          type: 'icon',
          position: {
            x: Math.round((centre.x - iconNodeWidth(ICON_SIZE) / 2) / GRID_SIZE) * GRID_SIZE,
            y: Math.round((centre.y - ICON_SIZE / 2) / GRID_SIZE) * GRID_SIZE,
          },
          selected: true,
          data: { label: icon.name, iconPath: icon.path, iconId: icon.iconId, iconSize: ICON_SIZE },
        }),
        edges: deselectAll(get().edges),
      }),

    addGroupNode: (groupType, position) => {
      const style = groupStyle(groupType)
      set({
        ...record(),
        nodes: insertNode(get().nodes, {
          id: newId('g'),
          type: 'awsGroup',
          position,
          width: style.width,
          height: style.height,
          selected: true,
          data: { label: style.label, groupType },
        }),
        edges: deselectAll(get().edges),
      })
    },

    reparentNodes: (ids) => {
      const nodes = reparent(get().nodes, ids)
      if (nodes !== get().nodes) set({ nodes })
    },

    updateNodeData: (id, patch) => {
      const node = get().nodes.find((n) => n.id === id)
      if (!node || Object.entries(patch).every(([k, v]) => node.data[k as keyof typeof node.data] === v)) return
      set({
        ...record(),
        nodes: get().nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AppNode) : n)),
      })
    },

    updateEdgeData: (id, patch) => get().updateEdgesData([id], patch),

    updateEdgesData: (ids, patch) => {
      const targets = new Set(ids)
      const differs = (e: AppEdge) => {
        const data = { ...DEFAULT_EDGE_DATA, ...e.data }
        return Object.entries(patch).some(([k, v]) => data[k as keyof AwsEdgeData] !== v)
      }
      if (!get().edges.some((e) => targets.has(e.id) && differs(e))) return
      set({
        ...record(),
        edges: get().edges.map((e) =>
          targets.has(e.id) ? { ...e, data: { ...DEFAULT_EDGE_DATA, ...e.data, ...patch } } : e,
        ),
      })
    },

    setIconSize: (ids, size) => {
      const targets = new Set(ids)
      const needsChange = (n: AppNode) => targets.has(n.id) && n.type === 'icon' && iconSizeOf(n) !== size
      if (!get().nodes.some(needsChange)) return
      set({
        ...record(),
        nodes: get().nodes.map((n) => {
          if (!needsChange(n) || n.type !== 'icon') return n
          const current = iconSizeOf(n)
          const dx = (iconNodeWidth(current) - iconNodeWidth(size)) / 2
          const dy = (current - size) / 2
          return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy }, data: { ...n.data, iconSize: size } }
        }),
      })
    },

    setEditingId: (editingId) => set({ editingId }),

    selectAll: () =>
      set({
        nodes: get().nodes.map((n) => ({ ...n, selected: true })),
        edges: get().edges.map((e) => ({ ...e, selected: true })),
      }),

    clearSelection: () => set({ nodes: deselectAll(get().nodes), edges: deselectAll(get().edges) }),

    deleteSelection: () => {
      const { nodes, edges } = get()
      const removed = selectionWithDescendants(nodes)
      const remainingEdges = edges.filter((e) => !e.selected && !removed.has(e.source) && !removed.has(e.target))
      if (removed.size === 0 && remainingEdges.length === edges.length) return
      set({
        ...record(),
        nodes: get().nodes.filter((n) => !removed.has(n.id)),
        edges: remainingEdges,
        editingId: null,
      })
    },

    nudgeSelection: (dx, dy) => {
      const { nodes } = get()
      const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
      // Only move the outermost selected nodes; children follow their parents.
      const movable = nodes.filter((n) => n.selected && !(n.parentId && selectedIds.has(n.parentId)))
      if (movable.length === 0) return
      const moved = nodes.map((n) =>
        movable.includes(n) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
      )
      set({ ...record(), nodes: reparent(moved, movable.map((n) => n.id)) })
    },

    copy: () => {
      const clipboard = copySelection(get().nodes, get().edges)
      if (!clipboard) return
      pasteCount = 0
      set({ clipboard })
    },

    cut: () => {
      get().copy()
      get().deleteSelection()
    },

    paste: () => {
      const { clipboard } = get()
      if (!clipboard) return
      pasteCount++
      const pasted = cloneClipboard(clipboard, pasteCount * GRID_SIZE * 3)
      const history = record()
      const nodes = reparent(sortNodes([...deselectAll(get().nodes), ...pasted.nodes]), pasted.topLevelIds)
      set({ ...history, nodes, edges: [...deselectAll(get().edges), ...pasted.edges] })
    },

    duplicate: () => {
      const data = copySelection(get().nodes, get().edges)
      if (!data) return
      const pasted = cloneClipboard(data, GRID_SIZE * 3)
      const history = record()
      const nodes = reparent(sortNodes([...deselectAll(get().nodes), ...pasted.nodes]), pasted.topLevelIds)
      set({ ...history, nodes, edges: [...deselectAll(get().edges), ...pasted.edges] })
    },

    undo: () => {
      finishLayoutAnimation?.()
      const { past, future, nodes, edges } = get()
      const previous = past.at(-1)
      if (!previous) return
      set({ ...previous, past: past.slice(0, -1), future: [{ nodes, edges }, ...future], editingId: null })
    },

    redo: () => {
      finishLayoutAnimation?.()
      const { past, future, nodes, edges } = get()
      const next = future[0]
      if (!next) return
      set({ ...next, past: [...past, { nodes, edges }], future: future.slice(1), editingId: null })
    },

    beginHistoryBatch: () => {
      finishLayoutAnimation?.()
      pendingSnapshot = { nodes: get().nodes, edges: get().edges }
    },

    endHistoryBatch: () => {
      const snapshot = pendingSnapshot
      pendingSnapshot = null
      if (snapshot && snapshotKey(snapshot) !== snapshotKey({ nodes: get().nodes, edges: get().edges })) {
        set(record(snapshot))
      }
    },

    applyLayout: (result) => {
      finishLayoutAnimation?.()
      if (isEmptyLayout(result)) return
      const { nodes, edges } = get()
      const target = applyLayoutResult(nodes, edges, result)
      set({ ...record(), edges: target.edges })
      finishLayoutAnimation = animate(
        LAYOUT_ANIMATION_MS,
        (t) => set({ nodes: interpolateNodes(nodes, target.nodes, t) }),
        () => {
          finishLayoutAnimation = null
          set({ nodes: target.nodes })
        },
      )
    },

    setName: (name) => set({ name }),

    newDiagram: () => set({ ...record(), nodes: [], edges: [], editingId: null, name: DEFAULT_NAME }),

    loadDiagram: ({ nodes, edges, name }) => {
      finishLayoutAnimation?.()
      set({ name: name || DEFAULT_NAME, nodes: sortNodes(nodes), edges, past: [], future: [], editingId: null })
    },
  }
})

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Handy for debugging and browser tests.
  ;(window as unknown as { __diagramStore: typeof useDiagramStore }).__diagramStore = useDiagramStore
}
