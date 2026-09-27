import { beforeEach, describe, expect, it } from 'vitest'
import { messyEdges, messyNodes } from '../layout/__fixtures__/messy'
import { autoArrange } from '../layout/autoArrange'
import { tidy } from '../layout/tidy'
import { newPage } from '../lib/persistence'
import { useDiagramStore } from './diagramStore'

describe('applyLayout', () => {
  beforeEach(() => useDiagramStore.getState().loadDiagram({ pages: [newPage('Page 1', { nodes: messyNodes, edges: messyEdges })] }))

  it('makes Tidy a single undo step that restores the previous layout exactly', () => {
    const before = useDiagramStore.getState()
    before.applyLayout(tidy(before.nodes, before.edges))

    const after = useDiagramStore.getState()
    expect(after.nodes).not.toEqual(before.nodes)
    expect(after.past).toHaveLength(1)

    after.undo()
    const restored = useDiagramStore.getState()
    expect(restored.nodes).toEqual(before.nodes)
    expect(restored.edges).toEqual(before.edges)

    restored.redo()
    expect(useDiagramStore.getState().nodes).toEqual(after.nodes)
  })

  it('makes Auto-arrange a single undo step too', async () => {
    const before = useDiagramStore.getState()
    before.applyLayout(await autoArrange(before.nodes, before.edges))
    expect(useDiagramStore.getState().past).toHaveLength(1)

    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().nodes).toEqual(before.nodes)
    expect(useDiagramStore.getState().edges).toEqual(before.edges)
  })

  it('does nothing when the layout has no changes', () => {
    const state = useDiagramStore.getState()
    state.applyLayout(tidy(state.nodes, state.edges))
    const tidied = useDiagramStore.getState()
    tidied.applyLayout(tidy(tidied.nodes, tidied.edges))
    expect(useDiagramStore.getState().past).toHaveLength(1)
  })
})
