import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newPage } from '../lib/persistence'
import { useDiagramStore } from '../store/diagramStore'
import type { AppNode, DiagramPage, SharedDoc } from '../types'
import { PUSH_DEBOUNCE_MS } from './config'
import { startSync } from './sync'

const icon = (id: string, x = 0, y = 0): AppNode =>
  ({
    id,
    type: 'icon',
    position: { x, y },
    data: { label: id, iconId: id, iconPath: `/aws-icons/services/Compute/Arch_${id}_48.svg` },
  }) as AppNode

const page = (id: string, name: string, nodes: AppNode[] = []): DiagramPage => ({ id, name, nodes, edges: [] })

/** Stands in for the Liveblocks middleware, which writes incoming storage straight into the store. */
const receiveFromRoom = (doc: SharedDoc) => useDiagramStore.setState({ doc })

const state = () => useDiagramStore.getState()
const activePage = () => state().pages.find((p) => p.id === state().activePageId)!

let sync: ReturnType<typeof startSync>

beforeEach(() => {
  vi.useFakeTimers()
  state().loadDiagram({ name: 'Untitled diagram', pages: [newPage('Page 1')] })
  useDiagramStore.setState({ doc: { name: 'Untitled diagram', pages: [{ ...activePage(), nodes: [], edges: [] }] } })
  sync = startSync()
})

afterEach(() => {
  sync.stop()
  vi.useRealTimers()
})

describe('room sync', () => {
  it('publishes local edits once the dust settles', () => {
    state().loadDiagram({ name: 'Mine', pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] })
    expect(state().doc.pages[0].nodes).toHaveLength(0)

    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)
    expect(state().doc.name).toBe('Mine')
    expect(state().doc.pages[0].nodes).toEqual([expect.objectContaining({ id: 'a' })])
  })

  it('publishes only what defines the diagram, not selection', () => {
    state().loadDiagram({ name: 'Mine', pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)
    state().selectAll()
    const before = state().doc

    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)
    // Same object: nothing worth sending changed.
    expect(state().doc).toBe(before)
    expect(JSON.stringify(before)).not.toContain('selected')
  })

  it('applies what arrives from the room', () => {
    receiveFromRoom({ name: 'Theirs', pages: [page(state().activePageId, 'Page 1', [icon('b', 40, 40)])] })

    expect(state().nodes.map((n) => n.id)).toEqual(['b'])
    expect(state().name).toBe('Theirs')
  })

  it('settles after a remote change instead of echoing it back and forth', () => {
    receiveFromRoom({ name: 'Theirs', pages: [page(state().activePageId, 'Page 1', [icon('b')])] })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 2)
    const settled = state().doc

    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 10)
    expect(state().doc).toBe(settled)
  })

  it('sends nothing at all when the arriving document already matches', () => {
    state().loadDiagram({ name: 'Theirs', pages: [newPage('Page 1', { nodes: [icon('b')], edges: [] })] })
    sync.flush()
    const sameAgain = JSON.parse(JSON.stringify(state().doc)) as SharedDoc

    receiveFromRoom(sameAgain)
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 4)
    // Untouched: the sync neither re-applied it locally nor published anything over it.
    expect(state().doc).toBe(sameAgain)
  })

  it('does not make someone else’s edit an undo step', () => {
    const past = state().past.length
    receiveFromRoom({ name: 'Theirs', pages: [page(state().activePageId, 'Page 1', [icon('b')])] })

    expect(state().past).toHaveLength(past)
  })

  it('ignores a malformed document rather than clearing the canvas', () => {
    state().loadDiagram({ name: 'Mine', pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)

    receiveFromRoom({ name: 'Broken', pages: [page(state().activePageId, 'Page 1', [{ id: 'x' } as unknown as AppNode])] })
    expect(state().nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('flush publishes straight away, so a new room starts from this canvas', () => {
    state().loadDiagram({ name: 'Mine', pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] })
    sync.flush()

    expect(state().doc.pages[0].nodes).toHaveLength(1)
  })

  it('stops publishing after leaving', () => {
    sync.stop()
    state().loadDiagram({ name: 'Mine', pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 4)

    expect(state().doc.pages[0].nodes).toHaveLength(0)
  })
})

describe('room sync across pages', () => {
  it('publishes every page, not just the one on screen', () => {
    state().addPage()
    state().addPage()
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)

    expect(state().doc.pages.map((p) => p.name)).toEqual(['Page 1', 'Page 2', 'Page 3'])
  })

  it('publishes the parked pages alongside the one being edited', () => {
    state().loadDiagram({ name: 'Two pages', pages: [page('p1', 'Page 1', [icon('a')]), page('p2', 'Page 2', [icon('b')])] })
    state().selectPage('p2')
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)

    expect(state().doc.pages.map((p) => p.nodes.map((n) => n.id))).toEqual([['a'], ['b']])
  })

  it('applies a remote edit to a page this user is not looking at', () => {
    state().loadDiagram({ name: 'Two pages', pages: [page('p1', 'Page 1', [icon('a')]), page('p2', 'Page 2')] })
    receiveFromRoom({ name: 'Two pages', pages: [page('p1', 'Page 1', [icon('a')]), page('p2', 'Page 2', [icon('z')])] })

    // The canvas is untouched; the other page quietly gained a node.
    expect(state().nodes.map((n) => n.id)).toEqual(['a'])
    expect(state().parked.p2.nodes.map((n) => n.id)).toEqual(['z'])
    state().selectPage('p2')
    expect(state().nodes.map((n) => n.id)).toEqual(['z'])
  })

  it('adds a page someone else created without moving this user', () => {
    state().loadDiagram({ name: 'One page', pages: [page('p1', 'Page 1')] })
    receiveFromRoom({ name: 'One page', pages: [page('p1', 'Page 1'), page('p2', 'Their page')] })

    expect(state().pages.map((p) => p.name)).toEqual(['Page 1', 'Their page'])
    expect(state().activePageId).toBe('p1')
  })

  it('moves this user off a page someone else deleted', () => {
    state().loadDiagram({ name: 'Two pages', pages: [page('p1', 'Page 1'), page('p2', 'Page 2', [icon('b')])] })
    state().selectPage('p2')
    receiveFromRoom({ name: 'Two pages', pages: [page('p1', 'Page 1', [icon('a')])] })

    expect(state().activePageId).toBe('p1')
    expect(state().nodes.map((n) => n.id)).toEqual(['a'])
  })
})
