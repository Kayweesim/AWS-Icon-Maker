import { beforeEach, describe, expect, it } from 'vitest'
import type { ClipboardData } from '../lib/clipboard'
import { newPage } from '../lib/persistence'
import { useDiagramStore } from './diagramStore'

const state = () => useDiagramStore.getState()
const selection: ClipboardData = {
  nodes: [
    { id: 'a', type: 'image', position: { x: 3000, y: 3000 }, width: 100, height: 100, data: { label: 'A', src: 'data:image/png;base64,AAEC/w==' } },
    { id: 'b', type: 'image', position: { x: 3200, y: 3000 }, width: 100, height: 100, data: { label: 'B', src: 'data:image/png;base64,AAEC/w==' } },
  ],
  edges: [{ id: 'ab', type: 'aws', source: 'a', target: 'b', sourceHandle: 'bottom', targetHandle: 'bottom',
    data: { label: 'Flow', pathType: 'step', dashed: false, arrows: 'end', elbowOffsets: [60] } }],
}

describe('pasting an external selection', () => {
  beforeEach(() => {
    state().endHistoryBatch()
    state().loadDiagram({ pages: [newPage('Destination', { nodes: [{ id: 'a', type: 'text', position: { x: 0, y: 0 }, data: { label: 'Keep me' } }], edges: [] })] })
  })

  it('merges at the destination, avoids ID collisions and undoes/redoes in one step', () => {
    state().paste(selection, { x: 500, y: 400 })
    expect(state().nodes).toHaveLength(3)
    expect(state().nodes[0].id).toBe('a')
    expect(state().nodes[1].id).not.toBe('a')
    expect(state().nodes[1].position).toEqual({ x: 350, y: 350 })
    expect(state().nodes[2].position).toEqual({ x: 550, y: 350 })
    expect(state().edges[0].source).toBe(state().nodes[1].id)
    expect(state().edges[0].target).toBe(state().nodes[2].id)
    expect(state().edges[0].data?.elbowOffsets).toEqual([60])
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().nodes).toHaveLength(1)
    expect(state().nodes[0].data.label).toBe('Keep me')
    expect(state().edges).toHaveLength(0)
    state().redo()
    expect(state().nodes).toHaveLength(3)
    expect(state().edges).toHaveLength(1)
  })

  it('offsets repeated pastes of the same selection', () => {
    state().paste(selection, { x: 500, y: 400 })
    const first = state().nodes.at(-1)!
    state().paste(selection, { x: 500, y: 400 })
    const second = state().nodes.at(-1)!
    expect(second.id).not.toBe(first.id)
    expect(second.position).toEqual({ x: first.position.x + 24, y: first.position.y + 24 })
    expect(state().past).toHaveLength(2)
  })
})
