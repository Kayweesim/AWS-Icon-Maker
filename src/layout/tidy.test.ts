import { describe, expect, it } from 'vitest'
import type { AppNode, IconNode } from '../types'
import { absoluteRects, escapedChildren, overlappingPairs } from './__fixtures__/assertions'
import { messyEdges, messyNodes } from './__fixtures__/messy'
import { applyLayoutResult } from './apply'
import { GRID_SIZE, GROUP_PADDING, ICON_SIZE } from './config'
import { tidy } from './tidy'
import { isEmptyLayout } from './types'

const run = (nodes = messyNodes, selectedIds?: string[]) =>
  applyLayoutResult(nodes, messyEdges, tidy(nodes, messyEdges, { selectedIds }))

const byId = (nodes: AppNode[], id: string) => nodes.find((n) => n.id === id)!

describe('tidy', () => {
  it('resets every icon to the standard size', () => {
    const { nodes } = run()
    for (const node of nodes) if (node.type === 'icon') expect(node.data.iconSize).toBe(ICON_SIZE)
  })

  it('snaps every node to the grid', () => {
    const { nodes } = run()
    for (const node of nodes) {
      // Math.abs: a negative multiple of 8 has a remainder of -0.
      expect(Math.abs(node.position.x % GRID_SIZE), node.id).toBe(0)
      expect(Math.abs(node.position.y % GRID_SIZE), node.id).toBe(0)
    }
  })

  it('aligns nodes that are nearly in line', () => {
    const rects = absoluteRects(run().nodes)
    // web1/web2 started ~6px apart horizontally, alb/cw ~6px apart vertically.
    const centreX = (id: string) => rects.get(id)!.x + rects.get(id)!.width / 2
    const iconCentreY = (id: string) => rects.get(id)!.y + ICON_SIZE / 2
    expect(centreX('web1')).toBe(centreX('web2'))
    expect(iconCentreY('alb')).toBe(iconCentreY('cw'))
  })

  it('leaves no overlapping nodes', () => {
    expect(overlappingPairs(messyNodes).length).toBeGreaterThan(0)
    expect(overlappingPairs(run().nodes)).toEqual([])
  })

  it('fits every group around its children with even padding', () => {
    const { nodes } = run()
    expect(escapedChildren(nodes)).toEqual([])
    const rects = absoluteRects(nodes)
    for (const groupId of ['vpc', 'subA', 'subB']) {
      const group = rects.get(groupId)!
      const children = nodes.filter((n) => n.parentId === groupId).map((n) => rects.get(n.id)!)
      const left = Math.min(...children.map((c) => c.x)) - group.x
      const top = Math.min(...children.map((c) => c.y)) - group.y
      const right = group.x + group.width - Math.max(...children.map((c) => c.x + c.width))
      const bottom = group.y + group.height - Math.max(...children.map((c) => c.y + c.height))
      expect(left, groupId).toBeGreaterThanOrEqual(GROUP_PADDING.left)
      expect(left, groupId).toBeLessThan(GROUP_PADDING.left + GRID_SIZE)
      expect(top, groupId).toBeGreaterThanOrEqual(GROUP_PADDING.top)
      expect(right, groupId).toBeGreaterThanOrEqual(GROUP_PADDING.right)
      expect(right, groupId).toBeLessThan(GROUP_PADDING.right + GRID_SIZE)
      expect(bottom, groupId).toBeGreaterThanOrEqual(GROUP_PADDING.bottom)
    }
  })

  it('keeps the layout roughly as drawn', () => {
    const before = absoluteRects(messyNodes)
    const after = absoluteRects(run().nodes)
    for (const id of ['vpc', 'web1', 'alb']) {
      expect(Math.abs(after.get(id)!.x - before.get(id)!.x), id).toBeLessThan(48)
      expect(Math.abs(after.get(id)!.y - before.get(id)!.y), id).toBeLessThan(48)
    }
    expect(after.get('alb')!.x).toBeLessThan(after.get('vpc')!.x)
    expect(after.get('subA')!.x).toBeLessThan(after.get('subB')!.x)
  })

  it('is stable when run again', () => {
    const once = run()
    const again = tidy(once.nodes, once.edges)
    expect(again.positions).toEqual({})
    expect(again.groupSizes).toEqual({})
    expect(isEmptyLayout(again)).toBe(true)
  })

  it('only changes the selection, growing ancestors if needed', () => {
    const { nodes } = run(messyNodes, ['subB'])
    for (const id of ['alb', 'cw', 'subA', 'web1', 'web2']) {
      expect(byId(nodes, id).position, id).toEqual(byId(messyNodes, id).position)
    }
    expect((byId(nodes, 'web1') as IconNode).data.iconSize).toBe(32)
    expect((byId(nodes, 'fn') as IconNode).data.iconSize).toBe(ICON_SIZE)
    expect(overlappingPairs(nodes.filter((n) => n.parentId === 'subB'))).toEqual([])
    expect(escapedChildren(nodes)).toEqual([])
  })

  it('connects edges on the sides that face each other', () => {
    const e1 = run().edges.find((e) => e.id === 'e1')!
    expect([e1.sourceHandle, e1.targetHandle]).toEqual(['right', 'left'])
  })

  it('returns nothing to do for an empty diagram', () => {
    expect(isEmptyLayout(tidy([], []))).toBe(true)
  })
})
