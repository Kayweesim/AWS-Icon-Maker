import type { XYPosition } from '@xyflow/react'
import type { AppEdge, AppNode } from '../types'
import { absolutePosition, absoluteRect, descendantIds } from './geometry'
import { newId } from './ids'

export type ClipboardData = { nodes: AppNode[]; edges: AppEdge[] }

/** Selected nodes plus their contents, and the edges running between them. */
export function selectionWithDescendants(nodes: AppNode[]): Set<string> {
  const ids = new Set<string>()
  for (const node of nodes) {
    if (!node.selected) continue
    ids.add(node.id)
    descendantIds(node.id, nodes).forEach((id) => ids.add(id))
  }
  return ids
}

export function copySelection(nodes: AppNode[], edges: AppEdge[]): ClipboardData | null {
  const ids = selectionWithDescendants(nodes)
  if (ids.size === 0) return null
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const copiedNodes = nodes
    .filter((n) => ids.has(n.id))
    .map((n): AppNode => {
      const base = { ...n, selected: false, dragging: false }
      if (n.parentId && ids.has(n.parentId)) return base
      // Top-level nodes of the copy are stored in absolute coordinates.
      return { ...base, parentId: undefined, position: absolutePosition(n, byId) }
    })
  const copiedEdges = edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({ ...e, selected: false }))

  return { nodes: copiedNodes, edges: copiedEdges }
}

/** Clones clipboard contents with fresh ids, offset from the originals and selected. */
export function cloneClipboard(data: ClipboardData, offset: number, centre?: XYPosition) {
  const idMap = new Map(data.nodes.map((n) => [n.id, newId(n.type === 'awsGroup' ? 'g' : 'n')]))
  let dx = offset, dy = offset
  if (centre && data.nodes.length) {
    const byId = new Map(data.nodes.map((node) => [node.id, node]))
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
    for (const node of data.nodes) {
      const rect = absoluteRect(node, byId)
      left = Math.min(left, rect.x); top = Math.min(top, rect.y)
      right = Math.max(right, rect.x + rect.width); bottom = Math.max(bottom, rect.y + rect.height)
    }
    dx += centre.x - (left + right) / 2
    dy += centre.y - (top + bottom) / 2
  }

  const nodes = data.nodes.map(
    (n): AppNode => ({
      ...n,
      id: idMap.get(n.id)!,
      parentId: n.parentId ? idMap.get(n.parentId) : undefined,
      position: n.parentId ? n.position : { x: n.position.x + dx, y: n.position.y + dy },
      selected: !n.parentId,
    }),
  )
  const edges = data.edges.map((e) => ({
    ...e,
    id: newId('e'),
    source: idMap.get(e.source)!,
    target: idMap.get(e.target)!,
    selected: true,
  }))
  const topLevelIds = nodes.filter((n) => !n.parentId).map((n) => n.id)

  return { nodes, edges, topLevelIds }
}
