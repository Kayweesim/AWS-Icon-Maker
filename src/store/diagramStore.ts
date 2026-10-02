import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { liveblocks, type WithLiveblocks } from '@liveblocks/zustand'
import { create, type StateCreator } from 'zustand'
import { collabClient, type UserPresence } from '../collab/client'
import { mergeRemote } from '../collab/merge'
import { ARROW_PRESETS, arrowPreset, DEFAULT_ARROW_PRESET, type ArrowPresetId } from '../data/arrows'
import { groupStyle, type GroupType } from '../data/groups'
import { applyLayoutResult } from '../layout/apply'
import { ICON_SIZE, LAYOUT_ANIMATION_MS, TEXT_FONT_SIZE } from '../layout/config'
import { facingHandles } from '../layout/shared'
import { iconNodeWidth, iconSizeOf } from '../layout/sizes'
import { isEmptyLayout, type LayoutResult } from '../layout/types'
import { animate, interpolateNodes } from '../lib/animation'
import { cloneClipboard, copySelection, selectionWithDescendants, type ClipboardData } from '../lib/clipboard'
import { absolutePosition, absoluteRect, descendantIds, findParentGroup, nodeSize, sortNodes } from '../lib/geometry'
import { HISTORY_LIMIT, snapshotKey, type Snapshot } from '../lib/history'
import { newId } from '../lib/ids'
import type { PreparedImage } from '../lib/imageDrop'
import { EMPTY_PAGE, neighbourOf, nextPageName, type PageTab, type ParkedPage } from '../lib/pages'
import { GRID_SIZE, type AppEdge, type AppNode, type AwsEdgeData, type DiagramPage, type SharedDoc } from '../types'

/** What clicking on the canvas does. */
export type Tool =
  | { kind: 'select' }
  /** Connect two nodes: click the source (unless already chosen), then the target. */
  | { kind: 'arrow'; preset: ArrowPresetId; sourceId: string | null }
  /** Click to place a text box. */
  | { kind: 'text' }

const SELECT_TOOL: Tool = { kind: 'select' }

/** Where quick add was opened: the clicked point on screen and on the canvas. */
export type QuickAddTarget = { screen: XYPosition; flow: XYPosition }

export type DiagramState = {
  name: string
  nodes: AppNode[]
  edges: AppEdge[]
  /** Id of the node or edge whose label is being edited inline. */
  editingId: string | null
  past: Snapshot[]
  future: Snapshot[]
  clipboard: ClipboardData | null
  tool: Tool
  /** Style for new arrows, whether drawn from handles or with the arrow tool. */
  arrowPreset: ArrowPresetId
  /** Open quick-add search panel, if any. */
  quickAdd: QuickAddTarget | null
  /** Group selected with ⌘-click: deleting it removes only the group and keeps its contents. */
  groupOnlyId: string | null
  /** The sheets of this diagram, in tab order. Shared with everyone in the room. */
  pages: PageTab[]
  /** The page this user is looking at. Personal: everyone can sit on a different page. */
  activePageId: string
  /** Contents of the pages this user is not looking at, keyed by page id. */
  parked: Record<string, ParkedPage>
  /** The diagram as shared with a collaboration room. Synced by Liveblocks; see /collab. */
  doc: SharedDoc
  /** What this user broadcasts to the room: identity, cursor and selected nodes. */
  presence: UserPresence

  onNodesChange: (changes: NodeChange<AppNode>[]) => void
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void
  onConnect: (connection: Connection) => void
  addIconNode: (icon: { iconId: string; name: string; path: string }, centre: XYPosition) => void
  addImageNode: (image: PreparedImage, centre: XYPosition) => void
  addGroupNode: (groupType: GroupType, position: XYPosition) => void
  /** Adds a text box at a point: with the given text, or empty and ready to type into. */
  addTextNode: (position: XYPosition, label?: string) => void
  /** Removes a text box with no text; undoing its creation too if that was the last step. */
  removeEmptyText: (id: string) => void
  /** Re-evaluates which group each node sits in, e.g. after a drag. */
  reparentNodes: (ids: string[]) => void
  updateNodeData: (id: string, patch: Partial<AppNode['data']>) => void
  updateEdgeData: (id: string, patch: Partial<AwsEdgeData>) => void
  /** Applies the same change to several edges as a single undo step. */
  updateEdgesData: (ids: string[], patch: Partial<AwsEdgeData>) => void
  /** Resizes icons around their centres as a single undo step. */
  setIconSize: (ids: string[], size: number) => void
  setEditingId: (id: string | null) => void

  /** Arrow mode, starting from the selected node if exactly one is selected. */
  startArrowMode: (preset?: ArrowPresetId) => void
  /** Cycles the style of the arrow currently being drawn, preserving its source node. */
  cycleArrowPreset: (step: -1 | 1) => void
  startTextMode: () => void
  cancelTool: () => void
  openQuickAdd: (target: QuickAddTarget) => void
  closeQuickAdd: () => void
  /** Restyles the selected arrows, or starts arrow mode with the style if none are selected. */
  pickArrowPreset: (preset: ArrowPresetId) => void
  /** Handles a node click in arrow mode. `keepGoing` continues from the target (Shift-click). */
  arrowModeClick: (nodeId: string, options?: { keepGoing?: boolean }) => void
  /** Connects two nodes on the sides that face each other. */
  connectNodes: (sourceId: string, targetId: string, preset?: ArrowPresetId) => void

  selectAll: () => void
  clearSelection: () => void
  deleteSelection: () => void
  /** Selects just a group (⌘-click), so Delete removes the group but keeps what's inside. */
  selectGroupOnly: (id: string) => void
  /** After a Shift+drag box selection: deselects groups and keeps only arrows between selected nodes. */
  selectServicesOnly: () => void
  /** Removes a group, moving its contents up to the group's parent without moving them on screen. */
  deleteGroupOnly: (id: string) => void
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

  /** Adds a page after the current one and switches to it. */
  addPage: () => void
  /** Removes a page and everything on it. The last remaining page can't be removed. */
  deletePage: (id: string) => void
  renamePage: (id: string, name: string) => void
  /** Parks the current page and opens another. Only changes what this user sees. */
  selectPage: (id: string) => void

  /** Publishes the local diagram to the room. Called by the collaboration sync, not the UI. */
  publishDoc: (doc: SharedDoc) => void
  /** Applies a diagram received from the room, keeping this user's selection and drag intact. */
  applyRemoteDoc: (doc: SharedDoc) => void
  setPresence: (patch: Partial<UserPresence>) => void
  /** Clears the canvas as an undoable step. */
  newDiagram: () => void
  /** Replaces the whole diagram, pages and all, and resets history. */
  loadDiagram: (diagram: { name?: string; pages: DiagramPage[] }) => void
  /**
   * Merges an opened file into the diagram: a page with the same id as one already here replaces
   * that page's contents (as an undo step on it); any other page fills the page in view if it's
   * empty, or is added at the end. Nothing is ever removed. Opens the first imported page.
   */
  importDiagram: (diagram: { name?: string; pages: DiagramPage[] }) => void
}

export const DEFAULT_NAME = 'Untitled diagram'

export const DEFAULT_EDGE_DATA: AwsEdgeData = { label: '', dashed: false, pathType: 'step', arrows: 'end' }

const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE || 0

const deselectAll = <T extends { selected?: boolean }>(items: T[]) =>
  items.map((item) => (item.selected ? { ...item, selected: false } : item))

const selectOnly = (nodes: AppNode[], id: string) =>
  nodes.map((n) => (!!n.selected === (n.id === id) ? n : { ...n, selected: n.id === id }))

/** The group selected with ⌘-click, while it's still the whole selection. */
export function groupOnlySelection(state: Pick<DiagramState, 'nodes' | 'edges' | 'groupOnlyId'>): string | null {
  const { groupOnlyId, nodes, edges } = state
  if (!groupOnlyId || edges.some((e) => e.selected)) return null
  const selected = nodes.filter((n) => n.selected)
  return selected.length === 1 && selected[0].id === groupOnlyId && selected[0].type === 'awsGroup' ? groupOnlyId : null
}

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

/** Where arrows attach: the icon's centre for services, the box centre otherwise. */
function connectionPoint(node: AppNode, byId: Map<string, AppNode>): XYPosition {
  const rect = absoluteRect(node, byId)
  const y = node.type === 'icon' ? rect.y + iconSizeOf(node) / 2 : rect.y + rect.height / 2
  return { x: rect.x + rect.width / 2, y }
}

// Snapshot taken when a drag or resize begins; committed to history if something changed.
const firstPage: PageTab = { id: newId('p'), name: 'Page 1' }

/** Reset when the canvas is swapped out from under the user. */
const clearedUiState = { editingId: null, tool: SELECT_TOOL, quickAdd: null, groupOnlyId: null } as const

/**
 * Opening a page also tells the room where this user went, so tabs show who is where and cursors
 * from another sheet stop being drawn. Keeping it here means presence can never drift.
 */
const onPage = (id: string, presence: UserPresence) => ({
  activePageId: id,
  presence: { ...presence, pageId: id, cursor: null, selectedNodeIds: [] },
})

const currentPage = (state: Pick<DiagramState, 'nodes' | 'edges' | 'past' | 'future'>): ParkedPage => ({
  nodes: state.nodes,
  edges: state.edges,
  past: state.past,
  future: state.future,
})

let pendingSnapshot: Snapshot | null = null
let pasteCount = 0
// Jumps a running layout animation to its end state.
let finishLayoutAnimation: (() => void) | null = null

export type DiagramStore = WithLiveblocks<DiagramState>

const createDiagramState: StateCreator<DiagramStore, [], [], DiagramState> = (set, get) => {
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
    tool: SELECT_TOOL,
    arrowPreset: DEFAULT_ARROW_PRESET,
    quickAdd: null,
    groupOnlyId: null,
    pages: [firstPage],
    activePageId: firstPage.id,
    parked: {},
    doc: { name: DEFAULT_NAME, pages: [{ ...firstPage, nodes: [], edges: [] }] },
    presence: { name: '', colour: '', cursor: null, pageId: firstPage.id, selectedNodeIds: [] },

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
      const style = arrowPreset(get().arrowPreset).style
      // Unlike React Flow's addEdge, allow several arrows between the same dots (say a request and
      // an async reply). They're drawn side by side; see parallelEdgeOffsets.
      const edge: AppEdge = { ...connection, id: newId('e'), type: 'aws', data: { ...DEFAULT_EDGE_DATA, ...style } }
      set({ ...record(), edges: [...get().edges, edge] })
    },

    addIconNode: (icon, centre) =>
      set({
        ...record(),
        nodes: insertNode(get().nodes, {
          id: newId('n'),
          type: 'icon',
          position: {
            x: snapToGrid(centre.x - iconNodeWidth(ICON_SIZE) / 2),
            y: snapToGrid(centre.y - ICON_SIZE / 2),
          },
          selected: true,
          data: { label: icon.name, iconPath: icon.path, iconId: icon.iconId, iconSize: ICON_SIZE },
        }),
        edges: deselectAll(get().edges),
      }),

    addImageNode: (image, centre) =>
      set({
        ...record(),
        nodes: insertNode(get().nodes, {
          id: newId('i'),
          type: 'image',
          position: {
            x: snapToGrid(centre.x - image.width / 2),
            y: snapToGrid(centre.y - image.height / 2),
          },
          width: image.width,
          height: image.height,
          selected: true,
          data: { label: image.name, src: image.src },
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

    addTextNode: (position, label) => {
      const id = newId('t')
      set({
        ...record(),
        nodes: insertNode(get().nodes, {
          id,
          type: 'text',
          // The text's first line sits at the click point.
          position: { x: snapToGrid(position.x), y: snapToGrid(position.y - TEXT_FONT_SIZE) },
          selected: true,
          data: { label: label ?? '', fontSize: TEXT_FONT_SIZE },
        }),
        edges: deselectAll(get().edges),
        editingId: label ? null : id,
        tool: SELECT_TOOL,
      })
    },

    removeEmptyText: (id) => {
      const { nodes, edges, past } = get()
      const node = nodes.find((n) => n.id === id)
      if (!node || node.type !== 'text' || node.data.label) return
      const remaining = {
        nodes: nodes.filter((n) => n.id !== id),
        edges: edges.filter((e) => e.source !== id && e.target !== id),
        editingId: get().editingId === id ? null : get().editingId,
      }
      const previous = past.at(-1)
      if (previous && !previous.nodes.some((n) => n.id === id)) {
        // The last step created this box; drop that step rather than recording a deletion.
        set({ ...remaining, past: past.slice(0, -1) })
      } else {
        set({ ...record(), ...remaining })
      }
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

    startArrowMode: (preset) => {
      const selected = get().nodes.filter((n) => n.selected)
      const chosen = preset ?? get().arrowPreset
      set({
        tool: { kind: 'arrow', preset: chosen, sourceId: selected.length === 1 ? selected[0].id : null },
        arrowPreset: chosen,
        editingId: null,
      })
    },

    cycleArrowPreset: (step) => {
      const { tool } = get()
      if (tool.kind !== 'arrow') return
      const currentIndex = ARROW_PRESETS.findIndex((preset) => preset.id === tool.preset)
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + step + ARROW_PRESETS.length) % ARROW_PRESETS.length
      const preset = ARROW_PRESETS[nextIndex].id
      set({ tool: { ...tool, preset }, arrowPreset: preset })
    },

    startTextMode: () => set({ tool: { kind: 'text' }, editingId: null }),

    cancelTool: () => set({ tool: SELECT_TOOL }),

    openQuickAdd: (quickAdd) => set({ quickAdd, editingId: null }),

    closeQuickAdd: () => {
      if (get().quickAdd) set({ quickAdd: null })
    },

    pickArrowPreset: (preset) => {
      const selectedEdges = get().edges.filter((e) => e.selected)
      if (selectedEdges.length === 0) return get().startArrowMode(preset)
      get().updateEdgesData(
        selectedEdges.map((e) => e.id),
        arrowPreset(preset).style,
      )
      set({ arrowPreset: preset })
    },

    arrowModeClick: (nodeId, options = {}) => {
      const { tool, nodes } = get()
      if (tool.kind !== 'arrow') return
      if (!tool.sourceId || !nodes.some((n) => n.id === tool.sourceId)) {
        set({ tool: { ...tool, sourceId: nodeId }, nodes: selectOnly(nodes, nodeId) })
        return
      }
      if (nodeId === tool.sourceId) return
      get().connectNodes(tool.sourceId, nodeId, tool.preset)
      set({
        tool: options.keepGoing ? { ...tool, sourceId: nodeId } : SELECT_TOOL,
        nodes: selectOnly(get().nodes, nodeId),
      })
    },

    connectNodes: (sourceId, targetId, preset = get().arrowPreset) => {
      const { nodes, edges } = get()
      const byId = new Map(nodes.map((n) => [n.id, n]))
      const source = byId.get(sourceId)
      const target = byId.get(targetId)
      if (!source || !target || sourceId === targetId) return
      const edge: AppEdge = {
        id: newId('e'),
        type: 'aws',
        source: sourceId,
        target: targetId,
        ...facingHandles(connectionPoint(source, byId), connectionPoint(target, byId)),
        data: { ...DEFAULT_EDGE_DATA, ...arrowPreset(preset).style },
      }
      set({ ...record(), edges: [...deselectAll(edges), edge] })
    },

    selectAll: () =>
      set({
        nodes: get().nodes.map((n) => ({ ...n, selected: true })),
        edges: get().edges.map((e) => ({ ...e, selected: true })),
      }),

    clearSelection: () => set({ nodes: deselectAll(get().nodes), edges: deselectAll(get().edges) }),

    deleteSelection: () => {
      const groupOnly = groupOnlySelection(get())
      if (groupOnly) return get().deleteGroupOnly(groupOnly)
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

    selectGroupOnly: (id) => {
      if (get().nodes.find((n) => n.id === id)?.type !== 'awsGroup') return
      set({ nodes: selectOnly(get().nodes, id), edges: deselectAll(get().edges), groupOnlyId: id, editingId: null })
    },

    selectServicesOnly: () => {
      const { nodes, edges } = get()
      const kept = new Set(nodes.filter((n) => n.selected && n.type !== 'awsGroup').map((n) => n.id))
      set({
        // Fresh objects, so React Flow also refreshes its own copy of the selection (it updates that
        // copy directly during a box selection) and its selection rectangle.
        nodes: nodes.map((n) => (n.type === 'awsGroup' ? { ...n, selected: false } : n)),
        edges: edges.map((e) => ({ ...e, selected: kept.has(e.source) && kept.has(e.target) })),
      })
    },

    deleteGroupOnly: (id) => {
      const { nodes, edges } = get()
      const group = nodes.find((n) => n.id === id)
      if (group?.type !== 'awsGroup') return
      const lifted = nodes
        .filter((n) => n.id !== id)
        .map((n) =>
          // Direct children move up a level; adding the group's offset keeps them in place.
          n.parentId === id
            ? ({
                ...n,
                parentId: group.parentId,
                position: { x: n.position.x + group.position.x, y: n.position.y + group.position.y },
              } as AppNode)
            : n,
        )
      set({
        ...record(),
        nodes: sortNodes(lifted),
        // Arrows to the group itself have nothing to attach to; arrows between its contents stay.
        edges: edges.filter((e) => e.source !== id && e.target !== id),
        groupOnlyId: null,
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
      set({ ...previous, past: past.slice(0, -1), future: [{ nodes, edges }, ...future], editingId: null, tool: SELECT_TOOL })
    },

    redo: () => {
      finishLayoutAnimation?.()
      const { past, future, nodes, edges } = get()
      const next = future[0]
      if (!next) return
      set({ ...next, past: [...past, { nodes, edges }], future: future.slice(1), editingId: null, tool: SELECT_TOOL })
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

    addPage: () => {
      const { pages, activePageId } = get()
      const page: PageTab = { id: newId('p'), name: nextPageName(pages) }
      const at = pages.findIndex((p) => p.id === activePageId)
      set({
        pages: [...pages.slice(0, at + 1), page, ...pages.slice(at + 1)],
        parked: { ...get().parked, [activePageId]: currentPage(get()) },
        ...onPage(page.id, get().presence),
        ...EMPTY_PAGE,
        ...clearedUiState,
      })
    },

    deletePage: (id) => {
      const { pages, activePageId, parked } = get()
      if (pages.length < 2 || !pages.some((p) => p.id === id)) return
      const next = id === activePageId ? neighbourOf(pages, id) : undefined
      const remaining = { ...parked }
      delete remaining[id]
      if (!next) {
        set({ pages: pages.filter((p) => p.id !== id), parked: remaining })
        return
      }
      const opened = remaining[next.id] ?? EMPTY_PAGE
      delete remaining[next.id]
      set({
        pages: pages.filter((p) => p.id !== id),
        parked: remaining,
        ...onPage(next.id, get().presence),
        ...opened,
        ...clearedUiState,
      })
    },

    renamePage: (id, name) =>
      set({
        pages: get().pages.map((page) => (page.id === id ? { ...page, name: name.trim().slice(0, 40) || page.name } : page)),
      }),

    selectPage: (id) => {
      const { activePageId, pages, parked } = get()
      if (id === activePageId || !pages.some((p) => p.id === id)) return
      finishLayoutAnimation?.()
      const opened = parked[id] ?? EMPTY_PAGE
      const rest = { ...parked, [activePageId]: currentPage(get()) }
      delete rest[id]
      set({ ...onPage(id, get().presence), parked: rest, ...opened, ...clearedUiState })
    },

    publishDoc: (doc) => set({ doc }),

    applyRemoteDoc: (doc) => {
      finishLayoutAnimation?.()
      const state = get()
      const pages = doc.pages.map(({ id, name }) => ({ id, name }))
      // Someone may have deleted the page this user was on.
      const active = pages.some((p) => p.id === state.activePageId) ? state.activePageId : pages[0].id
      const parked: Record<string, ParkedPage> = {}
      for (const page of doc.pages) {
        if (page.id === active) continue
        const existing = state.parked[page.id]
        // Other pages aren't on screen, so they take the room's version as-is, keeping local history.
        parked[page.id] = { nodes: page.nodes, edges: page.edges, past: existing?.past ?? [], future: existing?.future ?? [] }
      }
      const live = doc.pages.find((page) => page.id === active)!
      const onScreen = active === state.activePageId ? mergeRemote(state, live) : { nodes: live.nodes, edges: live.edges }
      // Not an undo step: Ctrl+Z should undo your own edits, not someone else's.
      set({
        name: doc.name || DEFAULT_NAME,
        pages,
        // Only a page that was deleted under this user counts as moving them; otherwise their
        // own cursor and selection presence must survive someone else's edit.
        ...(active === state.activePageId ? { activePageId: active } : onPage(active, state.presence)),
        parked,
        ...onScreen,
        ...(active === state.activePageId ? {} : { past: [], future: [], ...clearedUiState }),
      })
    },

    setPresence: (patch) => set({ presence: { ...get().presence, ...patch } }),

    newDiagram: () => {
      const page: PageTab = { id: newId('p'), name: 'Page 1' }
      finishLayoutAnimation?.()
      set({
        name: DEFAULT_NAME,
        pages: [page],
        ...onPage(page.id, get().presence),
        parked: {},
        ...EMPTY_PAGE,
        ...clearedUiState,
      })
    },

    loadDiagram: ({ pages, name }) => {
      finishLayoutAnimation?.()
      const [first, ...rest] = pages
      const parked: Record<string, ParkedPage> = {}
      for (const page of rest) parked[page.id] = { nodes: sortNodes(page.nodes), edges: page.edges, past: [], future: [] }
      set({
        name: name || DEFAULT_NAME,
        pages: pages.map(({ id, name: pageName }) => ({ id, name: pageName })),
        ...onPage(first.id, get().presence),
        parked,
        nodes: sortNodes(first.nodes),
        edges: first.edges,
        past: [],
        future: [],
        ...clearedUiState,
      })
    },

    importDiagram: (diagram) => {
      if (diagram.pages.length === 0) return
      const state = get()
      finishLayoutAnimation?.()

      // Park the page in view so every page is handled the same way, then open the target below.
      const parked: Record<string, ParkedPage> = { ...state.parked, [state.activePageId]: currentPage(state) }
      const pages = [...state.pages]
      const ids = new Set(pages.map((p) => p.id))
      // An empty page in view is filled by the first new page instead of a tab being added after it.
      let emptySlot =
        state.nodes.length === 0 && !diagram.pages.some((p) => p.id === state.activePageId) ? state.activePageId : null

      for (const page of diagram.pages) {
        const imported = { nodes: sortNodes(page.nodes), edges: page.edges }
        // Replacing keeps the old contents one undo away, so importing never loses anything.
        const replace = (slot: string) => {
          const existing = parked[slot] ?? EMPTY_PAGE
          delete parked[slot]
          pages[pages.findIndex((p) => p.id === slot)] = { id: page.id, name: page.name }
          parked[page.id] = {
            ...imported,
            past: [...existing.past, { nodes: existing.nodes, edges: existing.edges }].slice(-HISTORY_LIMIT),
            future: [],
          }
        }
        if (ids.has(page.id)) replace(page.id)
        else if (emptySlot) {
          replace(emptySlot)
          emptySlot = null
        } else {
          pages.push({ id: page.id, name: page.name })
          parked[page.id] = { ...imported, past: [], future: [] }
        }
        ids.add(page.id)
      }

      const target = diagram.pages[0].id
      const opened = parked[target]
      delete parked[target]
      set({
        name: state.name === DEFAULT_NAME ? diagram.name || DEFAULT_NAME : state.name,
        pages,
        ...onPage(target, state.presence),
        parked,
        ...opened,
        ...clearedUiState,
      })
    },
  }
}

/**
 * `doc` and `presence` are mirrored into the Liveblocks room the user has joined; everything else
 * stays local. Without a key the middleware is skipped and a dormant `liveblocks` stub stands in.
 */
const offline: DiagramStore['liveblocks'] = {
  enterRoom: () => () => {},
  leaveRoom: () => {},
  room: null,
  others: [],
  isStorageLoading: false,
  status: 'initial',
}

export const useDiagramStore = create<DiagramStore>()(
  collabClient
    ? liveblocks(createDiagramState, {
        client: collabClient,
        storageMapping: { doc: true },
        presenceMapping: { presence: true },
      })
    : (...args) => ({ ...createDiagramState(...args), liveblocks: offline }),
)

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Handy for debugging and browser tests.
  ;(window as unknown as { __diagramStore: typeof useDiagramStore }).__diagramStore = useDiagramStore
}
