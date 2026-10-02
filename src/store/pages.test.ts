import { beforeEach, describe, expect, it } from 'vitest'
import { newPage } from '../lib/persistence'
import type { AppNode } from '../types'
import { useDiagramStore } from './diagramStore'

const icon = (id: string): AppNode =>
  ({
    id,
    type: 'icon',
    position: { x: 0, y: 0 },
    data: { label: id, iconId: id, iconPath: `/aws-icons/services/Compute/Arch_${id}_48.svg` },
  }) as AppNode

const state = () => useDiagramStore.getState()
const names = () => state().pages.map((p) => p.name)
const onScreen = () => state().nodes.map((n) => n.id)

beforeEach(() => state().loadDiagram({ name: 'Sheets', pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] }))

describe('pages', () => {
  it('starts with one page holding the diagram', () => {
    expect(names()).toEqual(['Page 1'])
    expect(onScreen()).toEqual(['a'])
  })

  it('adds an empty page after the current one and opens it', () => {
    state().addPage()

    expect(names()).toEqual(['Page 1', 'Page 2'])
    expect(onScreen()).toEqual([])
    expect(state().activePageId).toBe(state().pages[1].id)
  })

  it('inserts the new page directly after the one in view', () => {
    state().addPage()
    state().addPage()
    state().selectPage(state().pages[0].id)
    state().addPage()

    expect(names()).toEqual(['Page 1', 'Page 4', 'Page 2', 'Page 3'])
  })

  it('keeps each page’s contents when switching back and forth', () => {
    const first = state().activePageId
    state().addPage()
    const second = state().activePageId
    state().addIconNode({ iconId: 'b', name: 'b', path: '/aws-icons/services/Compute/Arch_b_48.svg' }, { x: 100, y: 100 })
    expect(onScreen()).toHaveLength(1)

    state().selectPage(first)
    expect(onScreen()).toEqual(['a'])
    state().selectPage(second)
    expect(state().nodes[0].data.label).toBe('b')
  })

  it('keeps undo history per page', () => {
    state().addPage()
    state().addIconNode({ iconId: 'b', name: 'b', path: '/aws-icons/services/Compute/Arch_b_48.svg' }, { x: 0, y: 0 })
    const second = state().activePageId

    state().selectPage(state().pages[0].id)
    // Page 1 was never edited, so there is nothing to undo there.
    expect(state().past).toHaveLength(0)
    state().selectPage(second)
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(onScreen()).toEqual([])
  })

  it('renames a page, trimming and falling back to the old name', () => {
    const id = state().activePageId
    state().renamePage(id, '  Network  ')
    expect(names()).toEqual(['Network'])

    state().renamePage(id, '   ')
    expect(names()).toEqual(['Network'])
  })

  it('deletes a page and opens its neighbour', () => {
    state().addPage()
    state().addPage()
    const [first, , third] = state().pages
    state().selectPage(third.id)
    state().deletePage(third.id)

    expect(names()).toEqual(['Page 1', 'Page 2'])
    expect(state().activePageId).toBe(state().pages[1].id)

    state().deletePage(state().pages[1].id)
    expect(state().activePageId).toBe(first.id)
    expect(onScreen()).toEqual(['a'])
  })

  it('deleting a background page leaves the canvas alone', () => {
    state().addPage()
    const second = state().activePageId
    state().selectPage(state().pages[0].id)
    state().deletePage(second)

    expect(names()).toEqual(['Page 1'])
    expect(onScreen()).toEqual(['a'])
  })

  it('refuses to delete the last page', () => {
    state().deletePage(state().activePageId)

    expect(names()).toEqual(['Page 1'])
    expect(onScreen()).toEqual(['a'])
  })

  it('reuses freed page numbers instead of climbing forever', () => {
    state().addPage()
    state().deletePage(state().activePageId)
    state().addPage()

    expect(names()).toEqual(['Page 1', 'Page 2'])
  })

  it('copies between pages through the clipboard', () => {
    state().selectAll()
    state().copy()
    state().addPage()
    state().paste()

    expect(state().nodes).toHaveLength(1)
    expect(state().nodes[0].data.label).toBe('a')
    // The original is still on page 1.
    state().selectPage(state().pages[0].id)
    expect(onScreen()).toEqual(['a'])
  })

  it('a new diagram is a single empty page', () => {
    state().addPage()
    state().newDiagram()

    expect(names()).toEqual(['Page 1'])
    expect(onScreen()).toEqual([])
    expect(state().parked).toEqual({})
  })

  describe('importing a file', () => {
    const page = (id: string, name: string, ids: string[]) => ({ id, name, nodes: ids.map(icon), edges: [] })
    const pageNodes = (id: string) => {
      const s = state()
      return (id === s.activePageId ? s.nodes : (s.parked[id]?.nodes ?? [])).map((n) => n.id)
    }

    it('adds pages it doesn’t have and keeps every existing page', () => {
      const first = state().activePageId

      state().importDiagram({ name: 'Other', pages: [page('x1', 'Imported 1', ['x']), page('x2', 'Imported 2', ['y'])] })

      expect(names()).toEqual(['Page 1', 'Imported 1', 'Imported 2'])
      expect(pageNodes(first)).toEqual(['a'])
      expect(state().activePageId).toBe('x1')
      expect(onScreen()).toEqual(['x'])
      expect(pageNodes('x2')).toEqual(['y'])
    })

    it('replaces only the pages the file also has, as an undo step on each', () => {
      const first = state().activePageId
      state().addPage()
      const second = state().activePageId
      state().addIconNode({ iconId: 'b', name: 'b', path: '/aws-icons/services/Compute/Arch_b_48.svg' }, { x: 0, y: 0 })
      const kept = state().nodes.map((n) => n.id)

      state().importDiagram({ pages: [page(first, 'Renamed', ['z']), page('new', 'Extra', ['w'])] })

      expect(names()).toEqual(['Renamed', 'Page 2', 'Extra'])
      expect(state().activePageId).toBe(first)
      expect(onScreen()).toEqual(['z'])
      expect(pageNodes(second)).toEqual(kept)
      state().undo()
      expect(onScreen()).toEqual(['a'])
    })

    it('fills the empty page in view instead of adding a tab after it', () => {
      state().addPage()
      state().addPage()
      state().selectPage(state().pages[1].id)

      state().importDiagram({ pages: [page('x1', 'Imported 1', ['x']), page('x2', 'Imported 2', ['y'])] })

      expect(names()).toEqual(['Page 1', 'Imported 1', 'Page 3', 'Imported 2'])
      expect(onScreen()).toEqual(['x'])
      state().undo()
      expect(onScreen()).toEqual([])
    })

    it('adds a tab when the page in view has something on it', () => {
      state().addPage()
      state().selectPage(state().pages[0].id)

      state().importDiagram({ pages: [page('x1', 'Imported', ['x'])] })

      expect(names()).toEqual(['Page 1', 'Page 2', 'Imported'])
    })

    it('never drops a page on a second import of the same export', () => {
      state().addPage()
      state().selectPage(state().pages[0].id)
      state().importDiagram({ pages: [page('x1', 'Imported', ['x'])] })
      state().importDiagram({ pages: [page('x1', 'Imported', ['x2'])] })

      expect(names()).toEqual(['Page 1', 'Page 2', 'Imported'])
      expect(onScreen()).toEqual(['x2'])
    })

    it('takes the file’s place when the diagram is still fresh', () => {
      state().newDiagram()
      state().importDiagram({ name: 'Theirs', pages: [page('x1', 'Imported', ['x'])] })

      expect(names()).toEqual(['Imported'])
      expect(state().name).toBe('Theirs')
    })

    it('keeps the diagram’s own name once it has one', () => {
      state().importDiagram({ name: 'Theirs', pages: [page('x1', 'Imported', ['x'])] })
      expect(state().name).toBe('Sheets')
    })
  })
})
