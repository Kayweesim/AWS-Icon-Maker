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

  it('leaves room for long group labels', async () => {
    const { groupLabelLayout } = await import('./sizes')
    const { GROUP_HEADER_GAP } = await import('./config')
    const label = 'Security group — inbound 443 from the load balancer only'
    const icon = (id: string, parentId: string, x: number): AppNode => ({
      id,
      type: 'icon',
      position: { x, y: 80 },
      parentId,
      data: { label: id, iconId: 'svc:Compute/Amazon-EC2', iconPath: '/x.svg', iconSize: 64 },
    })
    const nodes: AppNode[] = [
      { id: 'vpc', type: 'awsGroup', position: { x: 0, y: 0 }, width: 900, height: 500, data: { label: 'VPC', groupType: 'vpc' } },
      { id: 'sg', type: 'awsGroup', position: { x: 40, y: 60 }, width: 200, height: 200, parentId: 'vpc', data: { label, groupType: 'security-group' } },
      icon('a', 'sg', 40),
      { id: 'sub', type: 'awsGroup', position: { x: 400, y: 60 }, width: 200, height: 200, parentId: 'vpc', data: { label: 'Private subnet', groupType: 'private-subnet' } },
      icon('b', 'sub', 40),
    ]
    const edges = [{ id: 'e', type: 'aws' as const, source: 'a', target: 'b', data: { label: '', dashed: false, pathType: 'step' as const, arrows: 'end' as const } }]
    const { nodes: arranged } = applyLayoutResult(nodes, edges, await autoArrange(nodes, edges))
    const group = arranged.find((n) => n.id === 'sg')!
    const { minWidth, headerHeight } = groupLabelLayout(label, false, group.width)

    expect(group.width).toBeGreaterThanOrEqual(minWidth)
    expect(arranged.find((n) => n.id === 'a')!.position.y).toBeGreaterThanOrEqual(headerHeight + GROUP_HEADER_GAP)
    expect(overlappingPairs(arranged)).toEqual([])
    expect(escapedChildren(arranged)).toEqual([])
  })

  describe('services with no arrows between them', () => {
    const icon = (id: string, x: number, y: number): AppNode => ({
      id,
      type: 'icon',
      position: { x, y },
      parentId: 'g',
      data: { label: id, iconId: 'svc:Compute/Amazon-EC2', iconPath: '/x.svg', iconSize: 64 },
    })
    const arrange = async (...icons: AppNode[]) => {
      const nodes: AppNode[] = [
        { id: 'g', type: 'awsGroup', position: { x: 0, y: 0 }, width: 900, height: 500, data: { label: 'VPC', groupType: 'vpc' } },
        ...icons,
      ]
      return applyLayoutResult(nodes, [], await autoArrange(nodes, [], { selectedIds: ['g'] })).nodes
    }
    const orderBy = (nodes: AppNode[], axis: 'x' | 'y') =>
      nodes.filter((n) => n.type === 'icon').sort((a, b) => a.position[axis] - b.position[axis]).map((n) => n.id)

    it('stay in a row when drawn in a row', async () => {
      const nodes = await arrange(icon('a', 40, 80), icon('b', 220, 100), icon('c', 400, 70), icon('d', 600, 115))
      const icons = nodes.filter((n) => n.type === 'icon')
      expect(new Set(icons.map((n) => n.position.y)).size).toBe(1)
      expect(orderBy(nodes, 'x')).toEqual(['a', 'b', 'c', 'd'])
      expect(overlappingPairs(nodes)).toEqual([])
      expect(escapedChildren(nodes)).toEqual([])
    })

    it('stay in a column when drawn in a column', async () => {
      const nodes = await arrange(icon('a', 80, 40), icon('b', 100, 200), icon('c', 70, 360))
      const icons = nodes.filter((n) => n.type === 'icon')
      expect(new Set(icons.map((n) => n.position.x)).size).toBe(1)
      expect(escapedChildren(nodes)).toEqual([])
    })
  })

  it('handles an empty diagram', async () => {
    expect(isEmptyLayout(await autoArrange([], []))).toBe(true)
  })
})
