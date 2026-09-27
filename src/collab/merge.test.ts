import { describe, expect, it } from 'vitest'
import type { AppEdge, AppNode, SharedDoc } from '../types'
import { mergeRemote } from './merge'

const icon = (id: string, x: number, y: number, extra: Partial<AppNode> = {}): AppNode =>
  ({
    id,
    type: 'icon',
    position: { x, y },
    data: { label: id, iconId: id, iconPath: `/aws-icons/services/Compute/Arch_${id}_48.svg` },
    ...extra,
  }) as AppNode

const group = (id: string, extra: Partial<AppNode> = {}): AppNode =>
  ({
    id,
    type: 'awsGroup',
    position: { x: 0, y: 0 },
    width: 400,
    height: 300,
    data: { label: 'VPC', groupType: 'vpc' },
    ...extra,
  }) as AppNode

const edge = (id: string, source: string, target: string, extra: Partial<AppEdge> = {}): AppEdge => ({
  id,
  type: 'aws',
  source,
  target,
  data: { label: '', dashed: false, pathType: 'step', arrows: 'end' },
  ...extra,
})

const doc = (nodes: AppNode[], edges: AppEdge[] = []): SharedDoc => ({ name: 'Shared', nodes, edges })

describe('mergeRemote', () => {
  it('takes positions, additions and removals from the room', () => {
    const local = { nodes: [icon('a', 0, 0), icon('b', 100, 0)], edges: [] }
    const merged = mergeRemote(local, doc([icon('a', 200, 40), icon('c', 300, 0)]))

    expect(merged.nodes.map((n) => n.id)).toEqual(['a', 'c'])
    expect(merged.nodes[0].position).toEqual({ x: 200, y: 40 })
  })

  it('keeps this user’s selection', () => {
    const local = {
      nodes: [icon('a', 0, 0, { selected: true }), icon('b', 100, 0)],
      edges: [edge('e', 'a', 'b', { selected: true })],
    }
    const merged = mergeRemote(local, doc([icon('a', 0, 0), icon('b', 100, 0)], [edge('e', 'a', 'b')]))

    expect(merged.nodes[0].selected).toBe(true)
    expect(merged.nodes[1].selected).toBeFalsy()
    expect(merged.edges[0].selected).toBe(true)
  })

  it('does not yank a node out from under a drag', () => {
    const local = { nodes: [icon('a', 500, 500, { dragging: true })], edges: [] }
    const merged = mergeRemote(local, doc([icon('a', 0, 0)]))

    expect(merged.nodes[0].position).toEqual({ x: 500, y: 500 })
    // Everything else about the node still comes from the room.
    expect(merged.nodes[0].data.label).toBe('a')
  })

  it('keeps a node being dragged that the room has not seen yet', () => {
    const local = { nodes: [icon('a', 0, 0), icon('new', 50, 50, { dragging: true })], edges: [] }
    expect(mergeRemote(local, doc([icon('a', 0, 0)])).nodes.map((n) => n.id)).toEqual(['a', 'new'])
  })

  it('keeps local size while a group is being resized', () => {
    const local = { nodes: [group('g', { width: 900, height: 700, resizing: true })], edges: [] }
    const merged = mergeRemote(local, doc([group('g')]))

    expect(merged.nodes[0].width).toBe(900)
    expect(merged.nodes[0].height).toBe(700)
  })

  it('orders parents before their children', () => {
    const child = icon('a', 10, 10, { parentId: 'g' })
    const merged = mergeRemote({ nodes: [], edges: [] }, doc([child, group('g')]))

    expect(merged.nodes.map((n) => n.id)).toEqual(['g', 'a'])
  })

  it('drops edges whose ends are gone', () => {
    const local = { nodes: [icon('a', 0, 0), icon('b', 1, 1)], edges: [edge('e', 'a', 'b')] }
    const merged = mergeRemote(local, doc([icon('a', 0, 0)], [edge('e', 'a', 'b')]))

    expect(merged.edges).toEqual([])
  })

  it('leaves the local arrays untouched', () => {
    const nodes = [icon('a', 0, 0)]
    const local = { nodes, edges: [] }
    mergeRemote(local, doc([icon('a', 99, 99)]))

    expect(nodes[0].position).toEqual({ x: 0, y: 0 })
  })
})
