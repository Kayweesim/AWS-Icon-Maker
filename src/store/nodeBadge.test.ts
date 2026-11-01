import { beforeEach, describe, expect, it } from 'vitest'
import { parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { newPage, parseDiagram, toFile } from '../lib/persistence'
import type { AppEdge, IconNode } from '../types'
import { useDiagramStore } from './diagramStore'

const state = () => useDiagramStore.getState()
const icon = (id: string, x: number): IconNode => ({
  id, type: 'icon', position: { x, y: 0 }, selected: true,
  data: { label: id, iconId: 'test', iconPath: '/aws-icons/test.svg', iconSize: 64 },
})
const edge: AppEdge = { id: 'ab', type: 'aws', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left', data: { label: '', dashed: false, pathType: 'step', arrows: 'end' } }
const icons = () => state().nodes as IconNode[]

describe('padlock badge', () => {
  beforeEach(() => {
    state().endHistoryBatch()
    state().loadDiagram({ pages: [newPage('Badges', { nodes: [icon('a', 0), icon('b', 200)], edges: [edge] })] })
  })

  it('changes several nodes in one undo step and touches nothing else', () => {
    const before = icons().map(({ position, width, height, data }) => ({ position, width, height, data: { ...data } }))
    const edges = state().edges
    state().setNodeBadge(['a', 'b'], 'padlock')
    expect(icons().map((n) => n.data.badge)).toEqual(['padlock', 'padlock'])
    icons().forEach((node, i) => {
      expect({ ...node.data, badge: undefined }).toEqual({ ...before[i].data, badge: undefined })
      expect(node.position).toEqual(before[i].position)
      expect(node.width).toBe(before[i].width)
      expect(node.height).toBe(before[i].height)
    })
    expect(state().edges).toBe(edges)
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(icons().map((n) => n.data.badge)).toEqual([undefined, undefined])
    state().redo()
    expect(icons().map((n) => n.data.badge)).toEqual(['padlock', 'padlock'])
  })

  it('leaves no field behind when removed, and adds no history for a no-op', () => {
    state().setNodeBadge(['a'], 'padlock')
    state().setNodeBadge(['a'], 'padlock')
    expect(state().past).toHaveLength(1)
    state().setNodeBadge(['a'], null)
    expect(icons()[0].data).not.toHaveProperty('badge')
    state().setNodeBadge(['b'], null)
    expect(state().past).toHaveLength(2)
  })

  it('completes a mixed selection without rewriting nodes that already have it', () => {
    state().setNodeBadge(['a'], 'padlock')
    const badged = icons()[0]
    state().setNodeBadge(['a', 'b'], 'padlock')
    expect(icons()[0]).toBe(badged)
    expect(icons()[1].data.badge).toBe('padlock')
  })

  it('ignores nodes that are not icons', () => {
    const text = { id: 't', type: 'text' as const, position: { x: 0, y: 0 }, data: { label: 'Note' } }
    state().loadDiagram({ pages: [newPage('Text', { nodes: [text], edges: [] })] })
    state().setNodeBadge(['t'], 'padlock')
    expect(state().nodes[0].data).not.toHaveProperty('badge')
    expect(state().past).toHaveLength(0)
  })

  it('survives a save and reload', () => {
    state().setNodeBadge(['a'], 'padlock')
    const file = JSON.parse(JSON.stringify(toFile({ name: 'D', pages: [newPage('P', { nodes: state().nodes, edges: state().edges })] })))
    const [a, b] = parseDiagram(file).pages[0].nodes as IconNode[]
    expect(a.data.badge).toBe('padlock')
    expect(b.data).not.toHaveProperty('badge')
  })

  it('loads diagrams without the field unchanged and drops unknown badges', () => {
    const plain = { id: 'a', type: 'icon', position: { x: 0, y: 0 }, data: { label: 'A', iconId: 'test', iconPath: '/aws-icons/test.svg', iconSize: 64 } }
    expect(parseDiagram({ nodes: [plain], edges: [] }).pages[0].nodes[0]).toEqual(plain)
    const odd = { ...plain, data: { ...plain.data, badge: '<script>' } }
    expect(parseDiagram({ nodes: [odd], edges: [] }).pages[0].nodes[0]).toEqual(plain)
  })

  it('survives copy and paste through the system clipboard format', () => {
    state().setNodeBadge(['a'], 'padlock')
    const copied = parseClipboard(serializeClipboard({ nodes: [icons()[0]], edges: [] }))
    state().paste(copied, { x: 500, y: 500 })
    expect(icons().at(-1)!.id).not.toBe('a')
    expect(icons().at(-1)!.data.badge).toBe('padlock')
  })
})
