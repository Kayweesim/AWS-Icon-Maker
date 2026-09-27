import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiagramStore } from '../store/diagramStore'
import type { AppNode, SharedDoc } from '../types'
import { PUSH_DEBOUNCE_MS } from './config'
import { startSync } from './sync'

const icon = (id: string, x = 0, y = 0): AppNode =>
  ({
    id,
    type: 'icon',
    position: { x, y },
    data: { label: id, iconId: id, iconPath: `/aws-icons/services/Compute/Arch_${id}_48.svg` },
  }) as AppNode

/** Stands in for the Liveblocks middleware, which writes incoming storage straight into the store. */
const receiveFromRoom = (doc: SharedDoc) => useDiagramStore.setState({ doc })

let sync: ReturnType<typeof startSync>

beforeEach(() => {
  vi.useFakeTimers()
  useDiagramStore.getState().loadDiagram({ nodes: [], edges: [], name: 'Untitled diagram' })
  useDiagramStore.setState({ doc: { name: 'Untitled diagram', nodes: [], edges: [] } })
  sync = startSync()
})

afterEach(() => {
  sync.stop()
  vi.useRealTimers()
})

describe('room sync', () => {
  it('publishes local edits once the dust settles', () => {
    useDiagramStore.getState().loadDiagram({ nodes: [icon('a')], edges: [], name: 'Mine' })
    expect(useDiagramStore.getState().doc.nodes).toHaveLength(0)

    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)
    expect(useDiagramStore.getState().doc).toEqual({ name: 'Mine', nodes: [expect.objectContaining({ id: 'a' })], edges: [] })
  })

  it('publishes only what defines the diagram, not selection', () => {
    useDiagramStore.getState().loadDiagram({ nodes: [icon('a')], edges: [], name: 'Mine' })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)
    useDiagramStore.getState().selectAll()
    const before = useDiagramStore.getState().doc

    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)
    // Same object: nothing worth sending changed.
    expect(useDiagramStore.getState().doc).toBe(before)
    expect(JSON.stringify(before)).not.toContain('selected')
  })

  it('applies what arrives from the room', () => {
    receiveFromRoom({ name: 'Theirs', nodes: [icon('b', 40, 40)], edges: [] })

    const state = useDiagramStore.getState()
    expect(state.nodes.map((n) => n.id)).toEqual(['b'])
    expect(state.name).toBe('Theirs')
  })

  it('settles after a remote change instead of echoing it back and forth', () => {
    receiveFromRoom({ name: 'Theirs', nodes: [icon('b')], edges: [] })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 2)
    const settled = useDiagramStore.getState().doc

    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 10)
    expect(useDiagramStore.getState().doc).toBe(settled)
  })

  it('sends nothing at all when the arriving document already matches', () => {
    useDiagramStore.getState().loadDiagram({ nodes: [icon('b')], edges: [], name: 'Theirs' })
    sync.flush()
    const published = useDiagramStore.getState().doc

    const sameAgain = JSON.parse(JSON.stringify(published)) as SharedDoc
    receiveFromRoom(sameAgain)
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 4)
    // Untouched: the sync neither re-applied it locally nor published anything over it.
    expect(useDiagramStore.getState().doc).toBe(sameAgain)
  })

  it('does not make someone else’s edit an undo step', () => {
    const past = useDiagramStore.getState().past.length
    receiveFromRoom({ name: 'Theirs', nodes: [icon('b')], edges: [] })

    expect(useDiagramStore.getState().past).toHaveLength(past)
  })

  it('ignores a malformed document rather than clearing the canvas', () => {
    useDiagramStore.getState().loadDiagram({ nodes: [icon('a')], edges: [], name: 'Mine' })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS)

    receiveFromRoom({ name: 'Broken', nodes: [{ id: 'x' } as unknown as AppNode], edges: [] })
    expect(useDiagramStore.getState().nodes.map((n) => n.id)).toEqual(['a'])
  })

  it('flush publishes straight away, so a new room starts from this canvas', () => {
    useDiagramStore.getState().loadDiagram({ nodes: [icon('a')], edges: [], name: 'Mine' })
    sync.flush()

    expect(useDiagramStore.getState().doc.nodes).toHaveLength(1)
  })

  it('stops publishing after leaving', () => {
    sync.stop()
    useDiagramStore.getState().loadDiagram({ nodes: [icon('a')], edges: [], name: 'Mine' })
    vi.advanceTimersByTime(PUSH_DEBOUNCE_MS * 4)

    expect(useDiagramStore.getState().doc.nodes).toHaveLength(0)
  })
})
