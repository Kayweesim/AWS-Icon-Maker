import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api'
import type { AppEdge, AppNode } from '../types'
import { AUTO_ARRANGE_SPACING, GROUP_PADDING, ICON_SIZE, LABEL_CHAR_WIDTH, LABEL_LINE_HEIGHT, NODE_GAP } from './config'
import { buildTree, fitGroup, makeBoxes, resolveScope, snap, snapUp, toLayoutResult, type Box, type Tree } from './shared'
import { emptyLayout, type LayoutOptions, type LayoutResult } from './types'

const elk = new ELK()

const ROOT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  // One run over all levels, so edges between nested nodes are routed and ordered together.
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  // Keep the current reading order where it doesn't cost crossings, so results feel familiar.
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.spacing.nodeNode': String(AUTO_ARRANGE_SPACING.nodeNode),
  'elk.layered.spacing.nodeNodeBetweenLayers': String(AUTO_ARRANGE_SPACING.betweenLayers),
  'elk.layered.spacing.edgeNodeBetweenLayers': String(AUTO_ARRANGE_SPACING.edgeNodeBetweenLayers),
  'elk.spacing.componentComponent': String(AUTO_ARRANGE_SPACING.components),
  'elk.padding': '[top=0,left=0,bottom=0,right=0]',
}

const GROUP_OPTIONS = {
  'elk.padding': `[top=${GROUP_PADDING.top},left=${GROUP_PADDING.left},bottom=${GROUP_PADDING.bottom},right=${GROUP_PADDING.right}]`,
}

const readingOrder = (boxes: Map<string, Box>) => (a: string, b: string) => {
  const [ba, bb] = [boxes.get(a)!, boxes.get(b)!]
  return ba.y - bb.y || ba.x - bb.x || a.localeCompare(b)
}

function toElkNode(id: string, tree: Tree, boxes: Map<string, Box>): ElkNode {
  const box = boxes.get(id)!
  const children = [...(tree.childrenOf.get(id) ?? [])].sort(readingOrder(boxes))
  if (box.kind === 'group' && children.length > 0) {
    return { id, layoutOptions: GROUP_OPTIONS, children: children.map((child) => toElkNode(child, tree, boxes)) }
  }
  return { id, width: box.width, height: box.height }
}

function isAncestor(tree: Tree, ancestorId: string, id: string) {
  for (let cursor = tree.parentOf.get(id); cursor; cursor = tree.parentOf.get(cursor)) if (cursor === ancestorId) return true
  return false
}

/** Edges inside the laid-out subtree. Edge labels reserve space so they don't sit on nodes. */
function toElkEdges(edges: AppEdge[], tree: Tree, members: Set<string>): ElkExtendedEdge[] {
  return edges
    .filter((e) => members.has(e.source) && members.has(e.target) && e.source !== e.target)
    .filter((e) => !isAncestor(tree, e.source, e.target) && !isAncestor(tree, e.target, e.source))
    .map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
      ...(e.data?.label && {
        labels: [{ text: e.data.label, width: e.data.label.length * LABEL_CHAR_WIDTH + 12, height: LABEL_LINE_HEIGHT + 4 }],
      }),
    }))
}

/** Copies ELK's result into the boxes, snapped to the grid. Groups get their size from ELK. */
function readBack(node: ElkNode, boxes: Map<string, Box>) {
  const box = boxes.get(node.id)!
  box.x = snap(node.x ?? 0)
  box.y = snap(node.y ?? 0)
  if (box.kind === 'group' && node.children?.length) {
    box.width = snapUp(node.width ?? box.width)
    box.height = snapUp(node.height ?? box.height)
  }
  node.children?.forEach((child) => readBack(child, boxes))
}

const bounds = (items: Box[]) => ({
  minX: Math.min(...items.map((b) => b.x)),
  minY: Math.min(...items.map((b) => b.y)),
  maxX: Math.max(...items.map((b) => b.x + b.width)),
  maxY: Math.max(...items.map((b) => b.y + b.height)),
})

/** Moves an arranged block right until it clears siblings that weren't part of the layout. */
function clearOfSiblings(block: Box[], fixed: Box[]) {
  for (let pass = 0; pass < 100 && fixed.length; pass++) {
    const b = bounds(block)
    const hit = fixed.find(
      (f) => b.minX < f.x + f.width + NODE_GAP && f.x < b.maxX + NODE_GAP && b.minY < f.y + f.height + NODE_GAP && f.y < b.maxY + NODE_GAP,
    )
    if (!hit) return
    const shift = snapUp(hit.x + hit.width + NODE_GAP - b.minX)
    block.forEach((box) => (box.x += shift))
  }
}

/**
 * Auto-arrange rebuilds the layout with ELK's layered algorithm: left-to-right along the
 * arrows, with minimal crossings. Group contents are laid out inside their group, so nodes
 * never leave their parent. With a selection, only the selected nodes are rearranged, in place.
 */
export async function autoArrange(nodes: AppNode[], edges: AppEdge[], options: LayoutOptions = {}): Promise<LayoutResult> {
  const tree = buildTree(nodes)
  const scope = resolveScope(tree, options.selectedIds)
  if (scope.size === 0) return emptyLayout()
  const boxes = makeBoxes(tree, scope, ICON_SIZE)

  // The outermost scoped nodes, grouped by the container they sit in.
  const blocks = new Map<string | null, string[]>()
  for (const id of scope) {
    const parent = tree.parentOf.get(id) ?? null
    if (parent !== null && scope.has(parent)) continue
    blocks.set(parent, [...(blocks.get(parent) ?? []), id])
  }

  for (const [container, ids] of blocks) {
    const topLevel = ids.map((id) => boxes.get(id)!)
    const origin = bounds(topLevel)

    const graph: ElkNode = {
      id: '__root__',
      layoutOptions: ROOT_OPTIONS,
      children: [...ids].sort(readingOrder(boxes)).map((id) => toElkNode(id, tree, boxes)),
      edges: toElkEdges(edges, tree, scope),
    }
    const laidOut = await elk.layout(graph)
    laidOut.children?.forEach((child) => readBack(child, boxes))

    // Refit groups bottom-up so padding and grid alignment match Tidy exactly.
    const groups = [...scope].filter((id) => boxes.get(id)!.kind === 'group')
    groups.sort((a, b) => tree.depthOf.get(b)! - tree.depthOf.get(a)!)
    for (const id of groups) {
      if (!ids.includes(id) && !isDescendantOfAny(tree, id, ids)) continue
      fitGroup(boxes.get(id)!, (tree.childrenOf.get(id) ?? []).map((child) => boxes.get(child)!))
    }

    // Keep the arranged block where the original was.
    const arranged = bounds(topLevel)
    const dx = snap(origin.minX - arranged.minX)
    const dy = snap(origin.minY - arranged.minY)
    topLevel.forEach((box) => {
      box.x += dx
      box.y += dy
    })

    const siblings = (tree.childrenOf.get(container) ?? []).filter((id) => !scope.has(id)).map((id) => boxes.get(id)!)
    clearOfSiblings(topLevel, siblings)
  }

  // Groups around a rearranged selection grow if the selection now sticks out.
  const ancestors = new Set<string>()
  for (const container of blocks.keys()) {
    for (let cursor = container; cursor; cursor = tree.parentOf.get(cursor) ?? null) ancestors.add(cursor)
  }
  for (const id of [...ancestors].sort((a, b) => tree.depthOf.get(b)! - tree.depthOf.get(a)!)) {
    fitGroup(boxes.get(id)!, (tree.childrenOf.get(id) ?? []).map((child) => boxes.get(child)!), { growOnly: true })
  }

  return toLayoutResult(tree, boxes, edges, scope)
}

function isDescendantOfAny(tree: Tree, id: string, ancestorIds: string[]) {
  return ancestorIds.some((ancestor) => isAncestor(tree, ancestor, id))
}
