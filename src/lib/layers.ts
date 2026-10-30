import type { AppEdge, AppNode } from '../types'

export type LayerAction = 'front' | 'forward' | 'backward' | 'back'
type Layer = { kind: 'node' | 'edge'; id: string; zIndex: number; selected: boolean }
type Elements = { nodes: AppNode[]; edges: AppEdge[] }

/** Layer values from files/rooms must fit in a CSS integer, with room for another edit. */
export const validLayer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= 1_000_000

/** Back to front. Old diagrams keep React Flow's unselected group/edge ordering. */
export function layerOrder({ nodes, edges }: Elements): Layer[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const nodeLayers = new Map<string, number>()
  const visiting = new Set<string>()
  const nodeLayer = (id: string): number => {
    const cached = nodeLayers.get(id)
    if (cached !== undefined) return cached
    const node = byId.get(id)
    if (!node || visiting.has(id)) return 0
    visiting.add(id)
    const value = validLayer(node.zIndex) ? node.zIndex : node.parentId ? nodeLayer(node.parentId) + 1 : 0
    visiting.delete(id)
    nodeLayers.set(id, value)
    return value
  }

  // At equal z-indices React Flow paints edges first, then nodes in their array order.
  return [
    ...edges.map((edge): Layer => ({
      kind: 'edge', id: edge.id, selected: !!edge.selected,
      zIndex: validLayer(edge.zIndex) ? edge.zIndex : Math.max(
        byId.get(edge.source)?.parentId ? nodeLayer(edge.source) : 0,
        byId.get(edge.target)?.parentId ? nodeLayer(edge.target) : 0,
      ),
    })),
    ...nodes.map((node): Layer => ({ kind: 'node', id: node.id, selected: !!node.selected, zIndex: nodeLayer(node.id) })),
  ].sort((a, b) => a.zIndex - b.zIndex)
}

export function layerAvailability(elements: Elements) {
  const order = layerOrder(elements)
  const first = order.findIndex((item) => item.selected)
  const last = order.findLastIndex((item) => item.selected)
  return {
    forward: first >= 0 && order.slice(first + 1).some((item) => !item.selected),
    backward: last >= 0 && order.slice(0, last).some((item) => !item.selected),
  }
}

/** Moves a mixed selection, preserving its relative order and all node parent relationships. */
export function moveLayers(elements: Elements, action: LayerAction): Elements | null {
  const order = layerOrder(elements)
  let next = [...order]
  if (action === 'front') next = [...order.filter((item) => !item.selected), ...order.filter((item) => item.selected)]
  else if (action === 'back') next = [...order.filter((item) => item.selected), ...order.filter((item) => !item.selected)]
  else if (action === 'forward') {
    for (let i = next.length - 2; i >= 0; i--) {
      if (next[i].selected && !next[i + 1].selected) [next[i], next[i + 1]] = [next[i + 1], next[i]]
    }
  } else {
    for (let i = 1; i < next.length; i++) {
      if (next[i].selected && !next[i - 1].selected) [next[i], next[i - 1]] = [next[i - 1], next[i]]
    }
  }
  if (next.every((item, index) => item === order[index])) return null

  // Compact ranks avoid ties, overflow and parent-dependent movement after the first edit.
  // Keep the arrays in their original order: React Flow still needs parents before children.
  const nodeRanks = new Map<string, number>(), edgeRanks = new Map<string, number>()
  next.forEach((item, index) => (item.kind === 'node' ? nodeRanks : edgeRanks).set(item.id, index))
  return {
    nodes: elements.nodes.map((node) => node.zIndex === nodeRanks.get(node.id) ? node : { ...node, zIndex: nodeRanks.get(node.id) }),
    edges: elements.edges.map((edge) => edge.zIndex === edgeRanks.get(edge.id) ? edge : { ...edge, zIndex: edgeRanks.get(edge.id) }),
  }
}

/** Once a page has custom layers, newly added elements appear at the front. */
export function newElementLayer(elements: Elements): number | undefined {
  if (![...elements.nodes, ...elements.edges].some((item) => validLayer(item.zIndex))) return undefined
  return (layerOrder(elements).at(-1)?.zIndex ?? -1) + 1
}

/**
 * Give each element two CSS levels: its artwork, then its label. Render ranks are transient;
 * the saved zIndex stays independent of selection, React Flow's parent elevation and overlays.
 */
export function renderLayers(elements: Elements): Elements {
  const nodeRanks = new Map<string, number>(), edgeRanks = new Map<string, number>()
  layerOrder(elements).forEach((item, index) => (item.kind === 'node' ? nodeRanks : edgeRanks).set(item.id, index * 2 + 2))
  return {
    nodes: elements.nodes.map((node) => ({
      ...node, zIndex: nodeRanks.get(node.id),
      // React Flow elevates children above their parent even in manual mode. Override that
      // presentation only, so a child can be sent behind any element without ungrouping it.
      style: { ...node.style, zIndex: nodeRanks.get(node.id) },
    })),
    edges: elements.edges.map((edge) => ({ ...edge, zIndex: edgeRanks.get(edge.id) })),
  }
}

export const EDITOR_OVERLAY_LAYER = 2_147_483_647
