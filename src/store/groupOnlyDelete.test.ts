import { beforeEach, describe, expect, it } from 'vitest'
import { absoluteRects } from '../layout/__fixtures__/assertions'
import type { AppEdge, AppNode } from '../types'
import { newPage } from '../lib/persistence'
import { groupOnlySelection, useDiagramStore } from './diagramStore'

const icon = (id: string, parentId: string, x: number, y: number): AppNode => ({
  id,
  type: 'icon',
  position: { x, y },
  parentId,
  data: { label: id, iconId: 'svc:Compute/Amazon-EC2', iconPath: '/x.svg', iconSize: 64 },
})

const edge = (id: string, source: string, target: string): AppEdge => ({
  id,
  type: 'aws',
  source,
  target,
  data: { label: '', dashed: false, pathType: 'step', arrows: 'end' },
})

// AWS Cloud > Region > EC2, and Lambda directly in the cloud.
const nodes: AppNode[] = [
  { id: 'cloud', type: 'awsGroup', position: { x: 50, y: 30 }, width: 1000, height: 800, data: { label: 'AWS Cloud', groupType: 'aws-cloud' } },
  { id: 'region', type: 'awsGroup', position: { x: 40, y: 60 }, width: 700, height: 600, parentId: 'cloud', data: { label: 'us-east-1', groupType: 'region' } },
  icon('ec2', 'region', 100, 100),
  icon('lambda', 'cloud', 860, 120),
]
const edges = [edge('internal', 'ec2', 'lambda'), edge('toCloud', 'lambda', 'cloud')]

const store = () => useDiagramStore.getState()
const select = (ids: string[]) =>
  useDiagramStore.setState({ nodes: store().nodes.map((n) => ({ ...n, selected: ids.includes(n.id) })) })

describe('deleting groups', () => {
  beforeEach(() => store().loadDiagram({ pages: [newPage('Page 1', { nodes, edges })] }))

  it('deletes a group with everything inside by default', () => {
    select(['cloud'])
    store().deleteSelection()
    expect(store().nodes).toEqual([])
    expect(store().edges).toEqual([])
  })

  it('⌘-click selection deletes only the group, keeping contents in place', () => {
    const before = absoluteRects(store().nodes)
    store().selectGroupOnly('cloud')
    expect(groupOnlySelection(store())).toBe('cloud')

    store().deleteSelection()
    const after = store().nodes
    expect(after.map((n) => n.id).sort()).toEqual(['ec2', 'lambda', 'region'])
    expect(after.find((n) => n.id === 'region')!.parentId).toBeUndefined()
    expect(after.find((n) => n.id === 'lambda')!.parentId).toBeUndefined()
    expect(after.find((n) => n.id === 'ec2')!.parentId).toBe('region')
    const rects = absoluteRects(after)
    for (const id of ['region', 'ec2', 'lambda']) expect(rects.get(id), id).toEqual(before.get(id))
    expect(store().edges.map((e) => e.id)).toEqual(['internal'])
  })

  it('works on nested groups and is a single undo step', () => {
    store().selectGroupOnly('region')
    // Undo restores the diagram as it was just before the delete, selection included.
    const original = store().nodes
    store().deleteSelection()
    expect(store().nodes.find((n) => n.id === 'ec2')!.parentId).toBe('cloud')
    expect(store().past).toHaveLength(1)
    store().undo()
    expect(store().nodes).toEqual(original)
  })

  it('ends group-only mode when the selection changes', () => {
    store().selectGroupOnly('cloud')
    select(['cloud', 'ec2'])
    expect(groupOnlySelection(store())).toBeNull()
    select(['cloud'])
    expect(groupOnlySelection(store())).toBe('cloud')
    select([])
    expect(groupOnlySelection(store())).toBeNull()
  })
})
