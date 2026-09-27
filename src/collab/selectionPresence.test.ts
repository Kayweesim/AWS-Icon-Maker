import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useDiagramStore, type DiagramStore } from '../store/diagramStore'
import type { AppEdge, AppNode } from '../types'
import { newPage } from '../lib/persistence'
import {
  remoteSelectionsFromTokens,
  remoteSelectionTokens,
  selectedNodeIds,
  startSelectionPresence,
} from './selectionPresence'

const icon = (id: string, selected = false, x = 0): AppNode => ({
  id,
  type: 'icon',
  position: { x, y: 0 },
  selected,
  data: { label: id, iconId: id, iconPath: `/aws-icons/services/Compute/Arch_${id}_48.svg` },
})

const edge = (id: string, source: string, target: string, selected = false): AppEdge => ({
  id,
  type: 'aws',
  source,
  target,
  selected,
  data: { label: '', dashed: false, pathType: 'step', arrows: 'end' },
})

type Other = DiagramStore['liveblocks']['others'][number]

/** The Zustand middleware maps the store's `presence` key onto this nested room-presence shape. */
const other = (
  connectionId: number,
  name: string,
  colour: string,
  ids?: string[],
): Other =>
  ({
    connectionId,
    presence: {
      presence: {
        name,
        colour,
        cursor: null,
        ...(ids === undefined ? {} : { selectedNodeIds: ids }),
      },
    },
  }) as unknown as Other

const store = () => useDiagramStore.getState()
let stopSelectionPresence: (() => void) | undefined

beforeEach(() => {
  store().loadDiagram({ name: 'Test diagram', pages: [newPage('Page 1', { nodes: [], edges: [] })] })
  store().setPresence({
    name: 'Local user',
    colour: '#123456',
    cursor: { x: 12, y: 34 },
    selectedNodeIds: [],
  })
})

afterEach(() => {
  stopSelectionPresence?.()
  stopSelectionPresence = undefined
})

describe('selected-node presence', () => {
  it('extracts only selected node ids in stable order', () => {
    expect(selectedNodeIds([icon('c', true), icon('b'), icon('a', true)])).toEqual(['a', 'c'])
  })

  it('publishes the current selection immediately when started', () => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('a', true), icon('b', false, 100)], edges: [] })] })

    stopSelectionPresence = startSelectionPresence()

    expect(store().presence.selectedNodeIds).toEqual(['a'])
  })

  it('tracks multi-selection and clearing it', () => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('a'), icon('b', false, 100)], edges: [] })] })
    stopSelectionPresence = startSelectionPresence()

    store().onNodesChange([
      { id: 'a', type: 'select', selected: true },
      { id: 'b', type: 'select', selected: true },
    ])
    expect(store().presence.selectedNodeIds).toEqual(['a', 'b'])

    store().clearSelection()
    expect(store().presence.selectedNodeIds).toEqual([])
  })

  it('clears presence when the selected node is deleted', () => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('a', true), icon('b', false, 100)], edges: [] })] })
    stopSelectionPresence = startSelectionPresence()

    store().deleteSelection()

    expect(store().nodes.map((node) => node.id)).toEqual(['b'])
    expect(store().presence.selectedNodeIds).toEqual([])
  })

  it('does not publish edge selection as node presence', () => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('a'), icon('b', false, 100)],
      edges: [edge('e', 'a', 'b', true)] })] })

    stopSelectionPresence = startSelectionPresence()

    expect(store().presence.selectedNodeIds).toEqual([])
  })

  it('preserves the user identity and cursor while publishing selection', () => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('a')], edges: [] })] })
    // Opening a page resets the pointer, so place it on this page before publishing a selection.
    store().setPresence({ cursor: { x: 12, y: 34 } })
    const cursor = store().presence.cursor
    stopSelectionPresence = startSelectionPresence()

    store().onNodesChange([{ id: 'a', type: 'select', selected: true }])

    expect(store().presence).toEqual({
      name: 'Local user',
      colour: '#123456',
      cursor,
      pageId: store().activePageId,
      selectedNodeIds: ['a'],
    })
    expect(store().presence.cursor).toBe(cursor)
  })

  it('does not update presence when only a selected node moves', () => {
    store().loadDiagram({ pages: [newPage('Page 1', { nodes: [icon('a', true)], edges: [] })] })
    stopSelectionPresence = startSelectionPresence()
    const before = store().presence

    store().onNodesChange([{ id: 'a', type: 'position', position: { x: 80, y: 40 } }])

    expect(store().nodes[0].position).toEqual({ x: 80, y: 40 })
    expect(store().presence).toBe(before)
  })
})

describe('remote selection derivation', () => {
  it('sorts users deterministically, de-duplicates node ids and supports selecting several nodes', () => {
    const tokens = remoteSelectionTokens([
      other(9, 'Nine', '#999999', ['b', 'a', 'a']),
      other(2, 'Two', '#222222', ['a', 'c']),
    ])

    expect(tokens).toEqual([2, 'Two', '#222222', 2, 'a', 'c', 9, 'Nine', '#999999', 2, 'b', 'a'])

    const byNode = remoteSelectionsFromTokens(tokens)
    expect(byNode.get('a')).toEqual([
      { connectionId: 2, name: 'Two', colour: '#222222' },
      { connectionId: 9, name: 'Nine', colour: '#999999' },
    ])
    expect(byNode.get('b')).toEqual([{ connectionId: 9, name: 'Nine', colour: '#999999' }])
    expect(byNode.get('c')).toEqual([{ connectionId: 2, name: 'Two', colour: '#222222' }])
  })

  it('ignores old clients that do not publish selected node ids', () => {
    const tokens = remoteSelectionTokens([other(1, 'Old client', '#111111'), other(2, 'New client', '#222222', ['a'])])

    expect(remoteSelectionsFromTokens(tokens)).toEqual(
      new Map([['a', [{ connectionId: 2, name: 'New client', colour: '#222222' }]]]),
    )
  })

  it('drops stale node ids when the caller supplies the current diagram ids', () => {
    const tokens = remoteSelectionTokens([other(1, 'One', '#111111', ['present', 'deleted'])])

    const byNode = remoteSelectionsFromTokens(tokens, new Set(['present']))

    expect([...byNode.keys()]).toEqual(['present'])
    expect(byNode.get('present')).toEqual([{ connectionId: 1, name: 'One', colour: '#111111' }])
  })
})
