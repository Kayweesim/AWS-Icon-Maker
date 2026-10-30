import { beforeEach, describe, expect, it } from 'vitest'
import { mergeRemote } from '../collab/merge'
import { copySelection } from '../lib/clipboard'
import { parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { wholeDiagram } from '../lib/document'
import { layerAvailability, layerOrder, moveLayers, renderLayers } from '../lib/layers'
import { newPage, parseDiagram, toFile } from '../lib/persistence'
import type { AppEdge, AppNode } from '../types'
import { useDiagramStore } from './diagramStore'

const state = () => useDiagramStore.getState()
const nodes: AppNode[] = [
  { id: 'vpc', type: 'awsGroup', position: { x: 100, y: 100 }, width: 600, height: 400, data: { label: 'VPC', groupType: 'vpc' } },
  { id: 'subnet', type: 'awsGroup', parentId: 'vpc', position: { x: 10, y: 10 }, width: 300, height: 200, data: { label: 'Public subnet', groupType: 'public-subnet' } },
  { id: 'service', type: 'icon', parentId: 'vpc', position: { x: 350, y: 20 }, data: { label: 'User svc', iconId: 'test', iconPath: '/aws-icons/test.svg', iconSize: 100 } },
  { id: 'cognito', type: 'icon', position: { x: 200, y: 600 }, data: { label: 'Cognito', iconId: 'test', iconPath: '/aws-icons/test.svg' } },
  { id: 'image', type: 'image', position: { x: 800, y: 0 }, width: 120, height: 80, data: { label: 'github', src: 'data:image/png;base64,AAEC/w==' } },
  { id: 'text', type: 'text', position: { x: 900, y: 0 }, data: { label: 'Notes', bold: true } },
]
const edge: AppEdge = { id: 'arrow', type: 'aws', source: 'service', target: 'cognito', selected: true, sourceHandle: 'left', targetHandle: 'top', data: { label: 'Sign in', dashed: false, pathType: 'step', arrows: 'end', elbowOffsets: [60] } }
const order = (elements = state()) => layerOrder(elements).map((item) => item.id)
const select = (nodeIds: string[], edgeIds: string[] = []) => useDiagramStore.setState({
  nodes: state().nodes.map((node) => ({ ...node, selected: nodeIds.includes(node.id) })),
  edges: state().edges.map((item) => ({ ...item, selected: edgeIds.includes(item.id) })),
})

describe('element layering', () => {
  beforeEach(() => {
    state().endHistoryBatch()
    state().loadDiagram({ pages: [newPage('Layers', { nodes, edges: [edge] })] })
  })

  it('keeps legacy unselected stacking until an explicit layer edit', () => {
    expect(order()).toEqual(['vpc', 'cognito', 'image', 'text', 'arrow', 'subnet', 'service'])
    const previous = renderLayers(state())
    select(['vpc', 'subnet'])
    const selected = renderLayers(state())
    expect(selected.nodes.map((node) => node.style?.zIndex)).toEqual(previous.nodes.map((node) => node.style?.zIndex))
    expect(selected.edges[0].zIndex).toBe(previous.edges[0].zIndex)
  })

  it('brings a hidden arrow above a subnet, and undoes/redoes it without changing its route', () => {
    const originalNodes = state().nodes
    const originalEdges = state().edges
    state().moveSelectionLayer('front')
    expect(order().at(-1)).toBe('arrow')
    expect(state().edges[0]).toMatchObject(edge)
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().nodes).toEqual(originalNodes)
    expect(state().edges).toEqual(originalEdges)
    state().redo()
    expect(order().at(-1)).toBe('arrow')
    state().moveSelectionLayer('back')
    expect(order()[0]).toBe('arrow')
    expect(renderLayers(state()).edges[0].zIndex).toBeLessThan(renderLayers(state()).nodes.find((node) => node.id === 'subnet')!.style!.zIndex as number)
  })

  it('moves one level at a time across nodes and arrows, including equal legacy layers', () => {
    state().moveSelectionLayer('forward')
    expect(order()).toEqual(['vpc', 'cognito', 'image', 'text', 'subnet', 'arrow', 'service'])
    state().moveSelectionLayer('backward')
    expect(order()).toEqual(['vpc', 'cognito', 'image', 'text', 'arrow', 'subnet', 'service'])
    state().moveSelectionLayer('backward')
    expect(order()).toEqual(['vpc', 'cognito', 'image', 'arrow', 'text', 'subnet', 'service'])
  })

  it('moves mixed selections together while keeping their order and one undo entry', () => {
    select(['text', 'subnet'], ['arrow'])
    state().moveSelectionLayer('forward')
    expect(order()).toEqual(['vpc', 'cognito', 'image', 'service', 'text', 'arrow', 'subnet'])
    expect(state().past).toHaveLength(1)
    state().moveSelectionLayer('back')
    expect(order().slice(0, 3)).toEqual(['text', 'arrow', 'subnet'])
    state().moveSelectionLayer('front')
    expect(order().slice(-3)).toEqual(['text', 'arrow', 'subnet'])
  })

  it('lets child nodes and groups move independently without changing containment or geometry', () => {
    const original = state().nodes
    select(['service'])
    state().moveSelectionLayer('back')
    expect(order()[0]).toBe('service')
    expect(state().nodes.map(({ zIndex: _z, selected: _s, ...node }) => node)).toEqual(original.map(({ selected: _s, ...node }) => node))
    let rendered = renderLayers(state())
    expect(rendered.nodes.find((node) => node.id === 'service')!.style!.zIndex).toBeLessThan(rendered.nodes.find((node) => node.id === 'vpc')!.style!.zIndex as number)
    select(['subnet'])
    state().moveSelectionLayer('front')
    rendered = renderLayers(state())
    expect(order().at(-1)).toBe('subnet')
    expect(rendered.nodes.find((node) => node.id === 'subnet')?.parentId).toBe('vpc')
    expect(state().nodes.map((node) => node.id)).toEqual(original.map((node) => node.id))
  })

  it('does not record no-ops at either boundary, with all selected, or with nothing selected', () => {
    state().moveSelectionLayer('front')
    expect(layerAvailability(state())).toEqual({ forward: false, backward: true })
    state().moveSelectionLayer('front')
    state().moveSelectionLayer('forward')
    expect(state().past).toHaveLength(1)
    state().moveSelectionLayer('back')
    expect(layerAvailability(state())).toEqual({ forward: true, backward: false })
    state().moveSelectionLayer('backward')
    state().moveSelectionLayer('back')
    expect(state().past).toHaveLength(2)
    state().selectAll()
    expect(layerAvailability(state())).toEqual({ forward: false, backward: false })
    state().moveSelectionLayer('back')
    state().clearSelection()
    state().moveSelectionLayer('front')
    expect(state().past).toHaveLength(2)
  })

  it('preserves every element layer through JSON, collaboration, duplication and cross-page paste', () => {
    state().moveSelectionLayer('front')
    const savedOrder = order()
    const parsed = parseDiagram(JSON.parse(JSON.stringify(toFile(wholeDiagram(state())))))
    state().loadDiagram(parsed)
    expect(order()).toEqual(savedOrder)
    const merged = mergeRemote({ nodes, edges: [edge] }, parsed.pages[0])
    expect(layerOrder(merged).map((item) => item.id)).toEqual(savedOrder)
    expect(merged.edges[0].selected).toBe(true)
    state().selectAll()
    const copied = parseClipboard(serializeClipboard(copySelection(state().nodes, state().edges)!))
    expect(layerOrder(copied).map((item) => item.id)).toEqual(savedOrder)
    const originalRanks = [...state().nodes, ...state().edges].map((item) => item.zIndex).sort()
    state().duplicate()
    const duplicates = [...state().nodes, ...state().edges].filter((item) => !savedOrder.includes(item.id))
    expect(duplicates.map((item) => item.zIndex).sort()).toEqual(originalRanks)
    state().addPage()
    state().paste(copied)
    expect([...state().nodes, ...state().edges].map((item) => item.zIndex).sort()).toEqual(originalRanks)
  })

  it('adds new elements at the front of a manually layered page', () => {
    state().moveSelectionLayer('front')
    state().addTextNode({ x: 1000, y: 1000 }, 'New text')
    expect(order().at(-1)).toBe(state().nodes.find((node) => node.data.label === 'New text')!.id)
    state().connectNodes('service', 'cognito')
    expect(order().at(-1)).toBe(state().edges.at(-1)!.id)
    state().addGroupNode('vpc', { x: 1500, y: 1000 })
    expect(order().at(-1)).toBe(state().nodes.find((node) => node.selected)!.id)
  })

  it('ignores malformed imported layers and bounds CSS ranks even for extreme valid layers', () => {
    for (const zIndex of [NaN, Infinity, 1.2, '2', null, 2 ** 31]) {
      const parsed = parseDiagram({ nodes: nodes.map((node) => ({ ...node, zIndex })), edges: [{ ...edge, zIndex }] }).pages[0]
      expect([...parsed.nodes, ...parsed.edges].every((item) => item.zIndex === undefined)).toBe(true)
    }
    const elements = { nodes: nodes.map((node) => ({ ...node, zIndex: -1_000_000 })), edges: [{ ...edge, zIndex: 1_000_000 }] }
    const rendered = renderLayers(elements)
    expect(rendered.edges[0].zIndex).toBe(14)
    expect(rendered.nodes.every((node) => Number(node.style?.zIndex) > 0)).toBe(true)
    expect(moveLayers(elements, 'back')!.edges[0].zIndex).toBe(0)
  })
})
