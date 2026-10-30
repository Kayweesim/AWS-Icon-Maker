import { beforeEach, describe, expect, it } from 'vitest'
import { newPage, parseDiagram, toFile } from '../lib/persistence'
import { wholeDiagram } from '../lib/document'
import { applyLayoutResult } from '../layout/apply'
import { copySelection } from '../lib/clipboard'
import { parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { useDiagramStore } from './diagramStore'
import type { AppEdge, AppNode } from '../types'

const nodes: AppNode[] = ['a', 'b'].map((id, index) => ({ id, type: 'text', position: { x: index * 300, y: index * 200 }, data: { label: id } }))
const edge: AppEdge = { id: 'ab', type: 'aws', source: 'a', target: 'b', data: { label: '', pathType: 'step', dashed: false, arrows: 'end' } }
const state = () => useDiagramStore.getState()

describe('elbow editing', () => {
  beforeEach(() => {
    state().endHistoryBatch()
    state().loadDiagram({ pages: [newPage('Page 1', { nodes, edges: [edge] })] })
  })

  it('groups a drag into a single undo/redo step', () => {
    state().beginHistoryBatch()
    state().updateEdgeData('ab', { elbowOffsets: [10] })
    state().updateEdgeData('ab', { elbowOffsets: [20] })
    state().updateEdgeData('ab', { elbowOffsets: [40] })
    expect(state().past).toHaveLength(0)
    state().endHistoryBatch()
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().edges[0].data?.elbowOffsets).toBeUndefined()
    state().redo()
    expect(state().edges[0].data?.elbowOffsets).toEqual([40])
  })

  it('does not record clicking without dragging', () => {
    state().beginHistoryBatch()
    state().endHistoryBatch()
    expect(state().past).toHaveLength(0)
  })

  it('keeps endpoint bends through a single drag undo, JSON, collaboration and portable copying', () => {
    state().updateEdgeData('ab', { elbowOffsets: [42] })
    state().beginHistoryBatch()
    state().updateEdgeData('ab', { elbowEndpointOffsets: { source: 20, target: -40 } })
    state().updateEdgeData('ab', { elbowEndpointOffsets: { source: 20, target: -100 } })
    state().endHistoryBatch()
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().edges[0].data?.elbowEndpointOffsets).toBeUndefined()
    expect(state().edges[0].data?.elbowOffsets).toEqual([42])
    state().redo()
    const saved = parseDiagram(JSON.parse(JSON.stringify(toFile(wholeDiagram(state())))))
    expect(saved.pages[0].edges[0].data?.elbowEndpointOffsets).toEqual({ source: 20, target: -100 })
    state().applyRemoteDoc(saved)
    state().selectAll()
    const copied = parseClipboard(serializeClipboard(copySelection(state().nodes, state().edges)!))
    state().addPage()
    state().paste(copied)
    expect(state().edges[0].data).toMatchObject({ elbowOffsets: [42], elbowEndpointOffsets: { source: 20, target: -100 } })
    state().selectAll()
    state().duplicate()
    expect(state().edges[1].data?.elbowEndpointOffsets).toEqual({ source: 20, target: -100 })
  })

  it('clears endpoint bends when reapplying a route preset or automatic routing', () => {
    for (const side of ['top', 'auto'] as const) {
      state().routeEdges(['ab'], side)
      state().updateEdgeData('ab', { elbowEndpointOffsets: { target: -80 } })
      state().routeEdges(['ab'], side)
      expect(state().edges[0].data?.elbowEndpointOffsets).toBeUndefined()
      state().undo()
      expect(state().edges[0].data?.elbowEndpointOffsets).toEqual({ target: -80 })
    }
  })

  it('only imports valid, bounded endpoint offsets', () => {
    for (const value of [NaN, Infinity, 'bad', 1_000_001, null, {}]) {
      const parsed = parseDiagram({ nodes, edges: [{ ...edge, data: { ...edge.data, elbowEndpointOffsets: { source: value, target: -40, extra: 20 } } }] })
      expect(parsed.pages[0].edges[0].data?.elbowEndpointOffsets).toEqual({ target: -40 })
    }
    for (const value of ['bad', [], null, { source: Infinity }]) {
      const parsed = parseDiagram({ nodes, edges: [{ ...edge, data: { ...edge.data, elbowEndpointOffsets: value } }] })
      expect(parsed.pages[0].edges[0].data?.elbowEndpointOffsets).toBeUndefined()
    }
  })

  it.each(['top', 'bottom', 'left', 'right'] as const)('routes around both nodes on the %s with one undo step', (side) => {
    state().onEdgesChange([{ id: 'ab', type: 'replace', item: {
      ...edge, sourceHandle: 'right', targetHandle: 'right',
      data: { ...edge.data!, label: 'Request', dashed: true, arrows: 'both', elbowOffsets: [10, 20, 30] },
    } }])
    const before = state().edges[0]
    const history = state().past.length
    state().routeEdges(['ab'], side)
    expect(state().edges[0]).toMatchObject({ sourceHandle: side, targetHandle: side,
      data: { label: 'Request', dashed: true, arrows: 'both', pathType: 'step',
        elbowOffsets: [side === 'top' || side === 'left' ? -60 : 60] } })
    expect(state().past).toHaveLength(history + 1)
    // Reapplying an unchanged route must not add another undo step.
    state().routeEdges(['ab'], side)
    expect(state().past).toHaveLength(history + 1)
    const saved = parseDiagram(JSON.parse(JSON.stringify(toFile(wholeDiagram(state())))))
    expect(saved.pages[0].edges[0].sourceHandle).toBe(side)
    expect(saved.pages[0].edges[0].targetHandle).toBe(side)
    expect(saved.pages[0].edges[0].data?.elbowOffsets).toEqual(state().edges[0].data?.elbowOffsets)
    state().undo()
    expect(state().edges[0]).toEqual(before)
    state().redo()
    expect(state().edges[0].sourceHandle).toBe(side)
  })

  it('restores facing connection sides with automatic routing', () => {
    state().routeEdges(['ab'], 'bottom')
    state().routeEdges(['ab'], 'auto')
    expect(state().edges[0]).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' })
    expect(state().edges[0].data?.elbowOffsets).toBeUndefined()
    state().undo()
    expect(state().edges[0].sourceHandle).toBe('bottom')
  })

  it('routes several selected edges together without touching other edges', () => {
    state().loadDiagram({ pages: [newPage('Page 1', { nodes, edges: [edge, { ...edge, id: 'second' }, { ...edge, id: 'untouched' }] })] })
    state().routeEdges(['ab', 'second', 'missing'], 'top')
    expect(state().edges.map((e) => e.sourceHandle)).toEqual(['top', 'top', undefined])
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().edges.every((e) => !e.sourceHandle)).toBe(true)
  })

  it('does not put another page in the new page’s undo history', () => {
    const originalPage = state().activePageId
    state().beginHistoryBatch()
    state().updateEdgeData('ab', { elbowOffsets: [10] })
    state().addPage()
    state().endHistoryBatch()
    expect(state().past).toHaveLength(0)
    state().selectPage(originalPage)
    state().undo()
    expect(state().edges[0].data?.elbowOffsets).toBeUndefined()
  })

  it('round-trips offsets through JSON and shared documents, with reset undoable', () => {
    state().updateEdgeData('ab', { elbowOffsets: [-40] })
    const saved = toFile(wholeDiagram(state()))
    const parsed = parseDiagram(JSON.parse(JSON.stringify(saved)))
    expect(parsed.pages[0].edges[0].data?.elbowOffsets).toEqual([-40])
    state().applyRemoteDoc(parsed)
    expect(state().edges[0].data?.elbowOffsets).toEqual([-40])
    state().updateEdgeData('ab', { elbowOffsets: undefined })
    state().undo()
    expect(state().edges[0].data?.elbowOffsets).toEqual([-40])
  })

  it.each([[NaN], [Infinity], ['bad'], [1_000_001], Array(17).fill(0)])('ignores invalid imported offsets: %j', (elbowOffsets) => {
    const parsed = parseDiagram({ nodes, edges: [{ ...edge, data: { ...edge.data, elbowOffsets } }] })
    expect(parsed.pages[0].edges[0].data?.elbowOffsets).toBeUndefined()
  })

  it('preserves relative bends when duplicating nodes and their arrow', () => {
    state().updateEdgeData('ab', { elbowOffsets: [36] })
    state().selectAll()
    state().duplicate()
    expect(state().edges[1].data?.elbowOffsets).toEqual([36])
    expect(state().edges[1].source).not.toBe('a')
  })

  it('clears manual bends only on arrows rerouted by a layout action', () => {
    const adjusted = { ...edge, data: { ...edge.data!, elbowOffsets: [40], elbowEndpointOffsets: { target: -80 } } }
    const result = applyLayoutResult(nodes, [adjusted], {
      positions: {}, groupSizes: {}, iconSizes: {},
      edgeHandles: { ab: { sourceHandle: 'bottom', targetHandle: 'top' } },
    })
    expect(result.edges[0].data?.elbowOffsets).toBeUndefined()
    expect(result.edges[0].data?.elbowEndpointOffsets).toBeUndefined()
  })
})
