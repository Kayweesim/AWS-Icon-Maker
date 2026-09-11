import type { AppEdge, AppNode } from '../types'
import { ALIGN_THRESHOLD, ICON_SIZE } from './config'
import { buildTree, fitGroup, makeBoxes, resolveScope, separateBoxes, snap, toLayoutResult, type Box } from './shared'
import { emptyLayout, type LayoutOptions, type LayoutResult } from './types'

/** Groups values that lie within ALIGN_THRESHOLD of the first value in their run. */
function alignAxis(boxes: Box[], read: (box: Box) => number, write: (box: Box, value: number) => void) {
  const sorted = [...boxes].sort((a, b) => read(a) - read(b))
  let run: Box[] = []
  const flush = () => {
    if (run.length > 1) {
      const target = snap(run.reduce((sum, box) => sum + read(box), 0) / run.length)
      run.forEach((box) => write(box, target))
    }
  }
  for (const box of sorted) {
    if (run.length && read(box) - read(run[0]) > ALIGN_THRESHOLD) {
      flush()
      run = []
    }
    run.push(box)
  }
  flush()
}

/** Icons align on their icon centres; groups align on their top-left corners. */
function alignSiblings(boxes: Box[]) {
  const icons = boxes.filter((box) => box.kind === 'icon')
  alignAxis(icons, (b) => b.y + b.iconSize / 2, (b, v) => (b.y = v - b.iconSize / 2))
  alignAxis(icons, (b) => b.x + b.width / 2, (b, v) => (b.x = v - b.width / 2))
  const groups = boxes.filter((box) => box.kind === 'group')
  alignAxis(groups, (b) => b.y, (b, v) => (b.y = v))
  alignAxis(groups, (b) => b.x, (b, v) => (b.x = v))
}

/**
 * Tidy keeps the layout roughly as drawn: standard icon sizes, grid snapping, alignment of
 * nearly-aligned siblings, overlap removal, and groups fitted to their contents.
 * Works bottom-up so each group is fitted after its contents are tidied.
 */
export function tidy(nodes: AppNode[], edges: AppEdge[], options: LayoutOptions = {}): LayoutResult {
  const tree = buildTree(nodes)
  const scope = resolveScope(tree, options.selectedIds)
  if (scope.size === 0) return emptyLayout()
  const boxes = makeBoxes(tree, scope, ICON_SIZE)

  // Containers whose children change: parents of scoped nodes, scoped groups, and their ancestors.
  const containers = new Set<string | null>()
  for (const id of scope) {
    if (boxes.get(id)!.kind === 'group') containers.add(id)
    containers.add(tree.parentOf.get(id) ?? null)
    for (let p = tree.parentOf.get(id); p; p = tree.parentOf.get(p)) containers.add(p)
  }
  const depth = (container: string | null) => (container === null ? -1 : tree.depthOf.get(container)!)

  for (const container of [...containers].sort((a, b) => depth(b) - depth(a))) {
    const children = (tree.childrenOf.get(container) ?? []).map((id) => boxes.get(id)!)
    const movable = children.filter((box) => scope.has(box.id))
    for (const box of movable) {
      box.x = snap(box.x)
      box.y = snap(box.y)
    }
    alignSiblings(movable)
    separateBoxes(children, (box) => scope.has(box.id))
    if (container !== null) {
      // Groups outside the selection only grow to keep containing their contents.
      fitGroup(boxes.get(container)!, children, { growOnly: !scope.has(container) })
    }
  }

  return toLayoutResult(tree, boxes, edges, scope)
}
