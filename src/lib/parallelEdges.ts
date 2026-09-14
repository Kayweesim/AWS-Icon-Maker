import { PARALLEL_EDGE_GAP } from '../layout/config'
import type { AppEdge } from '../types'

let cachedEdges: AppEdge[] | null = null
let cachedOffsets = new Map<string, number>()

const end = (node: string, handle: string | null | undefined) => `${node}:${handle ?? ''}`

/**
 * Sideways offset (px) for arrows that share both endpoints, in either direction, so they're
 * drawn side by side instead of on top of each other. The first arrow stays put; later ones go
 * below, above, further below, and so on. Cached per edges array, since every edge asks.
 */
export function parallelEdgeOffsets(edges: AppEdge[]): Map<string, number> {
  if (edges === cachedEdges) return cachedOffsets
  const seen = new Map<string, number>()
  const offsets = new Map<string, number>()
  for (const edge of edges) {
    const key = [end(edge.source, edge.sourceHandle), end(edge.target, edge.targetHandle)].sort().join('|')
    const index = seen.get(key) ?? 0
    seen.set(key, index + 1)
    const distance = Math.ceil(index / 2) * PARALLEL_EDGE_GAP
    offsets.set(edge.id, index % 2 === 1 ? distance : -distance || 0)
  }
  cachedEdges = edges
  cachedOffsets = offsets
  return offsets
}
