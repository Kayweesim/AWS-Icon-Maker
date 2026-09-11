import type { AppEdge, AppNode } from '../types'
import type { LayoutResult } from './types'

/** Applies a layout result to the diagram, returning new arrays with only changed items replaced. */
export function applyLayoutResult(nodes: AppNode[], edges: AppEdge[], result: LayoutResult) {
  const nextNodes = nodes.map((node): AppNode => {
    const position = result.positions[node.id]
    const size = result.groupSizes[node.id]
    const iconSize = result.iconSizes[node.id]
    if (!position && !size && iconSize === undefined) return node

    const next = { ...node, ...(position && { position: { ...position } }) } as AppNode
    if (size && next.type === 'awsGroup') {
      next.width = size.width
      next.height = size.height
    }
    if (iconSize !== undefined && next.type === 'icon') next.data = { ...next.data, iconSize }
    return next
  })

  const nextEdges = edges.map((edge) => {
    const handles = result.edgeHandles[edge.id]
    return handles ? { ...edge, ...handles } : edge
  })

  return { nodes: nextNodes, edges: nextEdges }
}
