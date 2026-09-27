import { beforeEach, describe, expect, it } from 'vitest'
import type { AppNode } from '../types'
import { useDiagramStore } from './diagramStore'
import { newPage } from '../lib/persistence'

const group: AppNode = {
  id: 'group',
  type: 'awsGroup',
  position: { x: 0, y: 0 },
  width: 400,
  height: 300,
  data: { label: 'Group', groupType: 'generic' },
}

const store = () => useDiagramStore.getState()

describe('addImageNode', () => {
  beforeEach(() => store().loadDiagram({ pages: [newPage('Page 1', { nodes: [group], edges: [] })] }))

  it('centres, nests and selects a dropped image as one undoable change', () => {
    store().addImageNode(
      { name: 'architecture', src: 'data:image/png;base64,AAEC/w==', width: 320, height: 160 },
      { x: 200, y: 150 },
    )

    const added = store().nodes.find((node) => node.type === 'image')
    expect(added).toMatchObject({
      type: 'image',
      parentId: 'group',
      position: { x: 40, y: 72 },
      width: 320,
      height: 160,
      selected: true,
      data: { label: 'architecture', src: 'data:image/png;base64,AAEC/w==' },
    })
    expect(store().nodes.find((node) => node.id === 'group')?.selected).toBeFalsy()
    expect(store().past).toHaveLength(1)

    store().undo()
    expect(store().nodes).toEqual([group])
  })
})
