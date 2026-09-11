import type { XYPosition } from '@xyflow/react'
import type { AppNode } from '../types'

export type Rect = { x: number; y: number; width: number; height: number }

const ICON_NODE_SIZE = { width: 96, height: 72 }

export function nodeSize(node: AppNode) {
  return {
    width: node.measured?.width ?? node.width ?? ICON_NODE_SIZE.width,
    height: node.measured?.height ?? node.height ?? ICON_NODE_SIZE.height,
  }
}

/** Position in flow coordinates, resolving the parent chain. */
export function absolutePosition(node: AppNode, byId: Map<string, AppNode>): XYPosition {
  let { x, y } = node.position
  let parent = node.parentId ? byId.get(node.parentId) : undefined
  while (parent) {
    x += parent.position.x
    y += parent.position.y
    parent = parent.parentId ? byId.get(parent.parentId) : undefined
  }
  return { x, y }
}

export function absoluteRect(node: AppNode, byId: Map<string, AppNode>): Rect {
  return { ...absolutePosition(node, byId), ...nodeSize(node) }
}

export function descendantIds(id: string, nodes: AppNode[]): Set<string> {
  const result = new Set<string>()
  let frontier = [id]
  while (frontier.length) {
    const next = nodes.filter((n) => n.parentId && frontier.includes(n.parentId)).map((n) => n.id)
    next.forEach((childId) => result.add(childId))
    frontier = next
  }
  return result
}

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

/**
 * The innermost group that should contain `rect`. Icons only need their centre inside
 * a group; groups must fit entirely inside their parent.
 */
export function findParentGroup(
  nodes: AppNode[],
  rect: Rect,
  options: { excludeIds?: Set<string>; wholeRect?: boolean } = {},
): AppNode | undefined {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const probe = options.wholeRect
    ? rect
    : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: 0, height: 0 }

  let best: AppNode | undefined
  let bestArea = Infinity
  for (const node of nodes) {
    if (node.type !== 'awsGroup' || options.excludeIds?.has(node.id)) continue
    const groupRect = absoluteRect(node, byId)
    const area = groupRect.width * groupRect.height
    if (area < bestArea && contains(groupRect, probe)) {
      best = node
      bestArea = area
    }
  }
  return best
}

/**
 * React Flow needs parents before children. Groups also render beneath icons,
 * and larger groups beneath the smaller ones placed on them.
 */
export function sortNodes(nodes: AppNode[]): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const depth = (node: AppNode): number => {
    let d = 0
    let parent = node.parentId ? byId.get(node.parentId) : undefined
    while (parent) {
      d++
      parent = parent.parentId ? byId.get(parent.parentId) : undefined
    }
    return d
  }
  const area = (n: AppNode) => {
    const { width, height } = nodeSize(n)
    return width * height
  }
  return nodes
    .map((node, index) => ({ node, index, depth: depth(node) }))
    .sort((a, b) => {
      const aGroup = a.node.type === 'awsGroup' ? 0 : 1
      const bGroup = b.node.type === 'awsGroup' ? 0 : 1
      return aGroup - bGroup || a.depth - b.depth || (aGroup === 0 ? area(b.node) - area(a.node) : 0) || a.index - b.index
    })
    .map((entry) => entry.node)
}
