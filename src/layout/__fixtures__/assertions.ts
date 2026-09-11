// Assertions shared by the layout tests.
import type { AppNode } from '../../types'
import { layoutSize } from '../sizes'

export type AbsRect = { id: string; x: number; y: number; width: number; height: number }

export function absoluteRects(nodes: AppNode[]): Map<string, AbsRect> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const rects = new Map<string, AbsRect>()
  for (const node of nodes) {
    let x = 0
    let y = 0
    for (let cursor: AppNode | undefined = node; cursor; cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined) {
      x += cursor.position.x
      y += cursor.position.y
    }
    rects.set(node.id, { id: node.id, x, y, ...layoutSize(node) })
  }
  return rects
}

export function isAncestor(nodes: AppNode[], ancestorId: string, id: string): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (let cursor = byId.get(id)?.parentId; cursor; cursor = byId.get(cursor)?.parentId) {
    if (cursor === ancestorId) return true
  }
  return false
}

/** Pairs of nodes (neither containing the other) whose boxes intersect. */
export function overlappingPairs(nodes: AppNode[]): string[] {
  const rects = absoluteRects(nodes)
  const pairs: string[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const [a, b] = [nodes[i], nodes[j]]
      if (isAncestor(nodes, a.id, b.id) || isAncestor(nodes, b.id, a.id)) continue
      const [ra, rb] = [rects.get(a.id)!, rects.get(b.id)!]
      if (ra.x < rb.x + rb.width && rb.x < ra.x + ra.width && ra.y < rb.y + rb.height && rb.y < ra.y + ra.height) {
        pairs.push(`${a.id}×${b.id}`)
      }
    }
  }
  return pairs
}

/** Children whose boxes extend outside their parent group. */
export function escapedChildren(nodes: AppNode[]): string[] {
  const rects = absoluteRects(nodes)
  return nodes
    .filter((node) => node.parentId && rects.has(node.parentId))
    .filter((node) => {
      const [c, p] = [rects.get(node.id)!, rects.get(node.parentId!)!]
      return c.x < p.x || c.y < p.y || c.x + c.width > p.x + p.width || c.y + c.height > p.y + p.height
    })
    .map((node) => node.id)
}
