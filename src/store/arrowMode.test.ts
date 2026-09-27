import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_ARROW_PRESET } from '../data/arrows'
import type { AppNode } from '../types'
import { useDiagramStore } from './diagramStore'
import { newPage } from '../lib/persistence'

const icon = (id: string, selected = false): AppNode => ({
  id,
  type: 'icon',
  position: { x: 0, y: 0 },
  selected,
  data: { label: id, iconId: `test:${id}`, iconPath: '/test.svg' },
})

const store = () => useDiagramStore.getState()

describe('arrow preset cycling', () => {
  beforeEach(() => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('source', true), icon('target')], edges: [] })] })
    useDiagramStore.setState({ arrowPreset: DEFAULT_ARROW_PRESET })
  })

  it('cycles forward without losing the arrow source or adding history', () => {
    store().startArrowMode()
    store().cycleArrowPreset(1)

    expect(store().tool).toEqual({ kind: 'arrow', preset: 'async', sourceId: 'source' })
    expect(store().arrowPreset).toBe('async')
    expect(store().past).toEqual([])
  })

  it('wraps in both directions', () => {
    store().startArrowMode('data-flow')
    store().cycleArrowPreset(-1)
    expect(store().tool).toEqual({ kind: 'arrow', preset: 'monitoring', sourceId: 'source' })

    store().cycleArrowPreset(1)
    expect(store().tool).toEqual({ kind: 'arrow', preset: 'data-flow', sourceId: 'source' })

    store().startArrowMode('monitoring')
    store().cycleArrowPreset(1)
    expect(store().tool).toEqual({ kind: 'arrow', preset: 'data-flow', sourceId: 'source' })
  })

  it('does nothing outside arrow mode', () => {
    store().cycleArrowPreset(-1)

    expect(store().tool).toEqual({ kind: 'select' })
    expect(store().arrowPreset).toBe('data-flow')
  })

  it('uses the cycled preset for the completed arrow', () => {
    store().startArrowMode()
    store().cycleArrowPreset(1)
    store().arrowModeClick('target')

    expect(store().edges).toHaveLength(1)
    expect(store().edges[0].data).toMatchObject({ dashed: true, arrows: 'end' })
  })
})
