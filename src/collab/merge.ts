/** Folding a diagram received from the room back into the local canvas. Pure. */

import { sortNodes } from '../lib/geometry'
import type { AppEdge, AppNode, DiagramPage } from '../types'

type Local = { nodes: AppNode[]; edges: AppEdge[] }

const isBusy = (node: AppNode | undefined) => !!node && (node.dragging === true || node.resizing === true)

/**
 * Remote state wins, except for what is personal to this user: selection stays put, and a node
 * being dragged or resized right now keeps its local geometry until the gesture ends.
 */
export function mergeRemote(local: Local, remote: Pick<DiagramPage, 'nodes' | 'edges'>): Local {
  const localNodes = new Map(local.nodes.map((n) => [n.id, n]))
  const localEdges = new Map(local.edges.map((e) => [e.id, e]))

  const merged = remote.nodes.map((node) => {
    const mine = localNodes.get(node.id)
    if (!mine) return node
    const kept = {
      ...node,
      selected: mine.selected,
      dragging: mine.dragging,
      resizing: mine.resizing,
      measured: mine.measured,
    } as AppNode
    if (!isBusy(mine)) return kept
    return { ...kept, position: mine.position, width: mine.width, height: mine.height, parentId: mine.parentId }
  })

  // A node this user is still dragging hasn't reached the room yet; don't let it blink out.
  const arrived = new Set(remote.nodes.map((n) => n.id))
  const inFlight = local.nodes.filter((n) => !arrived.has(n.id) && isBusy(n))

  const nodes = sortNodes([...merged, ...inFlight])
  const ids = new Set(nodes.map((n) => n.id))

  const edges = remote.edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => {
      const mine = localEdges.get(edge.id)
      return mine ? { ...edge, selected: mine.selected } : edge
    })

  return { nodes, edges }
}
