import type { XYPosition } from '@xyflow/react'
import type { AppEdge, AppNode } from '../types'
import { GRID_SIZE, GROUP_HEADER_GAP, GROUP_MIN_SIZE, GROUP_PADDING, NODE_GAP } from './config'
import { parseHandle, type HandleSide } from './handles'
import { groupHasIcon, groupLabelLayout, iconSizeOf, layoutSize } from './sizes'
import { emptyLayout, type LayoutResult } from './types'

/** Mutable working copy of a node's layout. Positions are relative to the parent. */
export type Box = {
  id: string
  kind: 'icon' | 'group' | 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  iconSize: number
  /** Group label, which sets a minimum width and the header height. */
  label: string
  hasIcon: boolean
}

// `|| 0` turns -0 into 0.
export const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE || 0
export const snapDown = (value: number) => Math.floor(value / GRID_SIZE) * GRID_SIZE || 0
export const snapUp = (value: number) => Math.ceil(value / GRID_SIZE) * GRID_SIZE || 0

export type Tree = {
  byId: Map<string, AppNode>
  parentOf: Map<string, string | undefined>
  /** Children per parent id; top-level nodes are under `null`. */
  childrenOf: Map<string | null, string[]>
  depthOf: Map<string, number>
}

/** Parent/child structure, ignoring parents that don't exist, aren't groups, or form cycles. */
export function buildTree(nodes: AppNode[]): Tree {
  const byId = new Map<string, AppNode>()
  for (const node of nodes) if (!byId.has(node.id)) byId.set(node.id, node)

  const declaredParent = (id: string) => {
    const parentId = byId.get(id)?.parentId
    return parentId && byId.get(parentId)?.type === 'awsGroup' ? parentId : undefined
  }

  const parentOf = new Map<string, string | undefined>()
  for (const id of byId.keys()) {
    const seen = new Set([id])
    let cursor = declaredParent(id)
    let valid = true
    while (cursor) {
      if (seen.has(cursor)) {
        valid = false
        break
      }
      seen.add(cursor)
      cursor = declaredParent(cursor)
    }
    parentOf.set(id, valid ? declaredParent(id) : undefined)
  }

  const childrenOf = new Map<string | null, string[]>()
  const depthOf = new Map<string, number>()
  for (const id of byId.keys()) {
    const parent = parentOf.get(id) ?? null
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), id])
    let depth = 0
    for (let p = parentOf.get(id); p; p = parentOf.get(p)) depth++
    depthOf.set(id, depth)
  }
  return { byId, parentOf, childrenOf, depthOf }
}

/** Ids to lay out: the selection and everything inside it, or the whole diagram. */
export function resolveScope(tree: Tree, selectedIds: string[] = []): Set<string> {
  const selected = selectedIds.filter((id) => tree.byId.has(id))
  if (selected.length === 0) return new Set(tree.byId.keys())
  const scope = new Set<string>()
  const add = (id: string) => {
    scope.add(id)
    for (const child of tree.childrenOf.get(id) ?? []) add(child)
  }
  selected.forEach(add)
  return scope
}

/** Working boxes for every node. Icons in scope are resized to `iconSize` around their icon centre. */
export function makeBoxes(tree: Tree, scope: Set<string>, iconSize?: number): Map<string, Box> {
  const boxes = new Map<string, Box>()
  for (const [id, node] of tree.byId) {
    const size = layoutSize(node)
    const box: Box = {
      id,
      kind: node.type === 'icon' ? 'icon' : node.type === 'text' ? 'text' : node.type === 'image' ? 'image' : 'group',
      x: node.position?.x ?? 0,
      y: node.position?.y ?? 0,
      ...size,
      iconSize: node.type === 'icon' ? iconSizeOf(node) : 0,
      label: node.type === 'awsGroup' ? (node.data?.label ?? '') : '',
      hasIcon: groupHasIcon(node),
    }
    if (node.type === 'icon' && iconSize && scope.has(id) && box.iconSize !== iconSize) {
      const cx = box.x + box.width / 2
      const cy = box.y + box.iconSize / 2
      const next = layoutSize(node, iconSize)
      Object.assign(box, { ...next, iconSize, x: cx - next.width / 2, y: cy - iconSize / 2 })
    }
    boxes.set(id, box)
  }
  return boxes
}

export function absolutePositionOf(tree: Tree, boxes: Map<string, Box>, id: string): XYPosition {
  let x = 0
  let y = 0
  for (let cursor: string | undefined = id; cursor; cursor = tree.parentOf.get(cursor)) {
    const box = boxes.get(cursor)!
    x += box.x
    y += box.y
  }
  return { x, y }
}

const gapOverlap = (a: Box, b: Box, gap: number) =>
  a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap

const readingOrder = (a: Box, b: Box) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id)

const centreY = (box: Box) => box.y + (box.kind === 'icon' ? box.iconSize / 2 : box.height / 2)
const centreX = (box: Box) => box.x + box.width / 2

/**
 * Pushes movable siblings right or down until none overlap. Only ever moving forward
 * guarantees this terminates; items in the same row move sideways, in the same column down.
 */
export function separateBoxes(siblings: Box[], canMove: (box: Box) => boolean, gap = NODE_GAP) {
  for (let pass = 0; pass < 200; pass++) {
    let moved = false
    const ordered = [...siblings].sort(readingOrder)
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const [a, b] = [ordered[i], ordered[j]]
        if (!gapOverlap(a, b, gap)) continue
        const mover = canMove(b) ? b : canMove(a) ? a : null
        if (!mover) continue
        const other = mover === b ? a : b
        const pushRight = snapUp(other.x + other.width + gap - mover.x)
        const pushDown = snapUp(other.y + other.height + gap - mover.y)
        const sameRow = Math.abs(centreY(mover) - centreY(other)) < 1
        const sameColumn = Math.abs(centreX(mover) - centreX(other)) < 1
        if (sameRow || (!sameColumn && pushRight <= pushDown)) mover.x += Math.max(pushRight, GRID_SIZE)
        else mover.y += Math.max(pushDown, GRID_SIZE)
        moved = true
      }
    }
    if (!moved) return
  }
}

/** Top padding a group needs so its label, wrapped at `width`, clears the contents. */
export function groupTopPadding(group: Pick<Box, 'label' | 'hasIcon'>, width: number) {
  const { headerHeight } = groupLabelLayout(group.label, group.hasIcon, width)
  return snapUp(Math.max(GROUP_PADDING.top, headerHeight + GROUP_HEADER_GAP))
}

/** Minimum width for a group: its label fits on one line, up to a cap. */
export const groupMinWidth = (group: Pick<Box, 'label' | 'hasIcon'>) =>
  Math.max(GROUP_MIN_SIZE.width, snapUp(groupLabelLayout(group.label, group.hasIcon).minWidth))

/**
 * Resizes a group to wrap its children with even padding, shifting children to match. The group
 * stays wide enough for its label, and the top padding grows if the label wraps.
 * With `growOnly`, the group keeps its bounds and only expands where a child sticks out.
 */
export function fitGroup(group: Box, children: Box[], options: { growOnly?: boolean } = {}) {
  if (children.length === 0) {
    group.width = Math.max(snapUp(group.width), groupMinWidth(group))
    group.height = Math.max(snapUp(group.height), GROUP_MIN_SIZE.height)
    return
  }
  const minX = Math.min(...children.map((c) => c.x))
  const minY = Math.min(...children.map((c) => c.y))
  const maxX = Math.max(...children.map((c) => c.x + c.width))
  const maxY = Math.max(...children.map((c) => c.y + c.height))

  let left = snapDown(minX - GROUP_PADDING.left)
  let right = snapUp(maxX + GROUP_PADDING.right)
  if (options.growOnly) {
    if (minX >= 0) left = 0
    if (maxX <= group.width) right = group.width
  }
  const width = Math.max(right - left, groupMinWidth(group))

  let top = snapDown(minY - groupTopPadding(group, width))
  let bottom = snapUp(maxY + GROUP_PADDING.bottom)
  if (options.growOnly) {
    if (top >= 0) top = 0
    if (maxY <= group.height) bottom = group.height
  }

  group.x += left
  group.y += top
  group.width = width
  group.height = Math.max(bottom - top, GROUP_MIN_SIZE.height)
  for (const child of children) {
    child.x -= left
    child.y -= top
  }
}

type Side = HandleSide

/** Handles on the sides of two nodes that face each other. */
export function facingHandles(source: XYPosition, target: XYPosition): { sourceHandle: Side; targetHandle: Side } {
  const dx = target.x - source.x
  const dy = target.y - source.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { sourceHandle: 'right', targetHandle: 'left' } : { sourceHandle: 'left', targetHandle: 'right' }
  }
  return dy >= 0 ? { sourceHandle: 'bottom', targetHandle: 'top' } : { sourceHandle: 'top', targetHandle: 'bottom' }
}

/** Converts working boxes back into the minimal set of changes. */
export function toLayoutResult(tree: Tree, boxes: Map<string, Box>, edges: AppEdge[], scope: Set<string>): LayoutResult {
  const result = emptyLayout()
  const changed = (a: number, b: number) => Math.abs(a - b) > 0.01

  for (const [id, node] of tree.byId) {
    const box = boxes.get(id)!
    if (changed(box.x, node.position?.x ?? 0) || changed(box.y, node.position?.y ?? 0)) {
      result.positions[id] = { x: box.x || 0, y: box.y || 0 }
    }
    if (node.type === 'awsGroup') {
      const current = layoutSize(node)
      if (changed(box.width, current.width) || changed(box.height, current.height)) {
        result.groupSizes[id] = { width: box.width, height: box.height }
      }
    } else if (node.type === 'icon' && box.iconSize !== iconSizeOf(node)) {
      result.iconSizes[id] = box.iconSize
    }
  }

  // Icons connect at their icon, not their label, so use the icon centre.
  const connectionPoint = (id: string): XYPosition => {
    const box = boxes.get(id)!
    const abs = absolutePositionOf(tree, boxes, id)
    return { x: abs.x + box.width / 2, y: abs.y + (box.kind === 'icon' ? box.iconSize / 2 : box.height / 2) }
  }
  for (const edge of edges) {
    if (!tree.byId.has(edge.source) || !tree.byId.has(edge.target)) continue
    if (!scope.has(edge.source) && !scope.has(edge.target)) continue
    const facing = facingHandles(connectionPoint(edge.source), connectionPoint(edge.target))
    // A hand-picked point is kept as long as it's on the side that now faces the other node.
    const keep = (current: string | null | undefined, side: Side) => (parseHandle(current)?.side === side ? current! : side)
    const handles = {
      sourceHandle: keep(edge.sourceHandle, facing.sourceHandle),
      targetHandle: keep(edge.targetHandle, facing.targetHandle),
    }
    if (edge.sourceHandle !== handles.sourceHandle || edge.targetHandle !== handles.targetHandle) {
      result.edgeHandles[edge.id] = handles
    }
  }
  return result
}
