import { describe, expect, it } from 'vitest'
import type { AppNode, IconNode } from '../types'
import { absoluteRects, escapedChildren, overlappingPairs } from './__fixtures__/assertions'
import { messyEdges, messyNodes } from './__fixtures__/messy'
import { applyLayoutResult } from './apply'
import { autoArrange } from './autoArrange'
import { GRID_SIZE, ICON_SIZE } from './config'
import { isEmptyLayout } from './types'

const run = async (nodes = messyNodes, selectedIds?: string[]) =>
  applyLayoutResult(nodes, messyEdges, await autoArrange(nodes, messyEdges, { selectedIds }))

const iconCentreX = (nodes: AppNode[], id: string) => {
  const rect = absoluteRects(nodes).get(id)!
  return rect.x + rect.width / 2
}

describe('autoArrange', () => {
  it('normalises icon sizes and snaps to the grid', async () => {
    const { nodes } = await run()
    for (const node of nodes) {
      if (node.type === 'icon') expect(node.data.iconSize).toBe(ICON_SIZE)
      expect(Math.abs(node.position.x % GRID_SIZE), node.id).toBe(0)
      expect(Math.abs(node.position.y % GRID_SIZE), node.id).toBe(0)
    }
  })

  it('leaves no overlaps and never moves nodes out of their parent', async () => {
    const { nodes } = await run()
    expect(overlappingPairs(nodes)).toEqual([])
    expect(escapedChildren(nodes)).toEqual([])
    expect(nodes.map((n) => [n.id, n.parentId])).toEqual(messyNodes.map((n) => [n.id, n.parentId]))
  })

  it('flows left to right following the arrows', async () => {
    const { nodes } = await run()
    const x = (id: string) => iconCentreX(nodes, id)
    expect(x('alb')).toBeLessThan(x('web1'))
    expect(x('alb')).toBeLessThan(x('web2'))
    expect(x('web1')).toBeLessThan(x('rds'))
    expect(x('web2')).toBeLessThan(x('rds'))
    expect(x('fn')).toBeLessThan(x('ddb'))
  })

  it('points connections from the right side of the source to the left of the target', async () => {
    const { edges } = await run()
    for (const edge of edges) expect([edge.sourceHandle, edge.targetHandle], edge.id).toEqual(['right', 'left'])
  })

  it('keeps the diagram near where it was', async () => {
    const before = [...absoluteRects(messyNodes).values()]
    const after = [...absoluteRects((await run()).nodes).values()]
    const left = (rects: typeof before) => Math.min(...rects.map((r) => r.x))
    const top = (rects: typeof before) => Math.min(...rects.map((r) => r.y))
    expect(Math.abs(left(after) - left(before))).toBeLessThanOrEqual(GRID_SIZE)
    expect(Math.abs(top(after) - top(before))).toBeLessThanOrEqual(GRID_SIZE)
  })

  it('is deterministic', async () => {
    const [a, b] = await Promise.all([autoArrange(messyNodes, messyEdges), autoArrange(messyNodes, messyEdges)])
    expect(a).toEqual(b)
  })

  it('only rearranges the selection', async () => {
    const { nodes } = await run(messyNodes, ['subB'])
    const byId = (id: string) => nodes.find((n) => n.id === id)!
    for (const id of ['alb', 'cw', 'subA', 'web1', 'web2', 'rds']) {
      expect(byId(id).position, id).toEqual(messyNodes.find((n) => n.id === id)!.position)
    }
    expect((byId('web1') as IconNode).data.iconSize).toBe(32)
    expect(iconCentreX(nodes, 'fn')).toBeLessThan(iconCentreX(nodes, 'ddb'))
    expect(escapedChildren(nodes)).toEqual([])
    expect(overlappingPairs(nodes.filter((n) => ['subA', 'subB', 'rds'].includes(n.id)))).toEqual([])
  })

  it('handles an empty diagram', async () => {
    expect(isEmptyLayout(await autoArrange([], []))).toBe(true)
  })
})
