import { beforeEach, describe, expect, it } from 'vitest'
import { mergeRemote } from '../collab/merge'
import { exportDrawio } from '../exporters/drawio'
import { copySelection } from '../lib/clipboard'
import { parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { wholeDiagram } from '../lib/document'
import { mediaSize } from '../lib/mediaResize'
import { newPage, parseDiagram, toFile } from '../lib/persistence'
import type { AppEdge, IconNode, ImageNode } from '../types'
import { useDiagramStore } from './diagramStore'

const state = () => useDiagramStore.getState()
const image: ImageNode = { id: 'image', type: 'image', position: { x: 0, y: 0 }, width: 320, height: 160, selected: true, data: { label: 'Logo', src: 'data:image/png;base64,AAEC/w==' } }
const icon: IconNode = { id: 'icon', type: 'icon', position: { x: 400, y: 0 }, selected: true, data: { iconSize: 64, iconId: 'test', iconPath: '/aws-icons/test.svg', label: 'Service' } }
const edge: AppEdge = { id: 'edge', type: 'aws', source: 'image', target: 'icon', sourceHandle: 'right', targetHandle: 'left', data: { label: '', dashed: false, pathType: 'step', arrows: 'end' } }

describe('image and icon resize integration', () => {
  beforeEach(() => {
    state().endHistoryBatch()
    state().loadDiagram({ pages: [newPage('Resize test', { nodes: [image, icon], edges: [edge] })] })
  })

  it('groups a live resize into one undo step and releases resize ownership', () => {
    state().beginHistoryBatch()
    state().onNodesChange([{ id: 'image', type: 'dimensions', resizing: true }])
    state().resizeMedia('image', { width: 240, height: 120 }, { x: 0, y: 0 })
    state().resizeMedia('image', { width: 160, height: 80 }, { x: 0, y: 0 })
    expect(state().past).toHaveLength(0)
    state().endHistoryBatch()
    expect(state().past).toHaveLength(1)
    expect(state().nodes[0].resizing).toBe(false)
    expect(state().edges).toEqual([edge])
    state().undo()
    expect(state().nodes[0].width).toBe(320)
    state().redo()
    expect(state().nodes[0].width).toBe(160)
  })

  it('does not add history for a click or a size already in use', () => {
    state().beginHistoryBatch()
    state().onNodesChange([{ id: 'icon', type: 'dimensions', resizing: true }])
    state().resizeMedia('icon', { width: 64, height: 64 })
    state().endHistoryBatch()
    state().setIconSize(['icon'], 64)
    expect(state().past).toHaveLength(0)
  })

  it('ends the resize on page switch without leaving a node permanently busy', () => {
    const pageId = state().activePageId
    state().beginHistoryBatch()
    state().onNodesChange([{ id: 'image', type: 'dimensions', resizing: true }])
    state().resizeMedia('image', { width: 80, height: 40 })
    state().addPage()
    state().selectPage(pageId)
    expect(state().nodes[0].resizing).toBe(false)
    state().undo()
    expect(state().nodes[0].width).toBe(320)
  })

  it('applies a custom size to multiple icons in one undo step', () => {
    state().onNodesChange([{ type: 'add', item: { ...icon, id: 'other', position: { x: 600, y: 0 } } }])
    state().setIconSize(['icon', 'other', 'image'], 100)
    expect(state().nodes.filter((n) => n.type === 'icon').map((n) => n.data.iconSize)).toEqual([100, 100])
    expect(state().nodes[0].width).toBe(320)
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().nodes.filter((n) => n.type === 'icon').map((n) => n.data.iconSize)).toEqual([64, 64])
  })

  it('retains sizes through JSON, shared documents, portable copy/paste and draw.io export', () => {
    state().resizeMedia('image', { width: 80, height: 40 })
    state().setIconSize(['icon'], 128)
    const parsed = parseDiagram(JSON.parse(JSON.stringify(toFile(wholeDiagram(state())))))
    expect(parsed.pages[0].nodes[0]).toMatchObject({ width: 80, height: 40 })
    expect(parsed.pages[0].nodes[1].data).toMatchObject({ iconSize: 128 })
    state().applyRemoteDoc(parsed)
    const copied = parseClipboard(serializeClipboard(copySelection(state().nodes, state().edges)!))
    expect(copied.nodes[0].width).toBe(80)
    expect(copied.nodes[1].data).toMatchObject({ iconSize: 128 })
    state().paste(copied)
    expect(state().nodes.at(-2)?.width).toBe(80)
    expect(state().nodes.at(-1)?.data).toMatchObject({ iconSize: 128 })
    const xml = exportDrawio({ name: 'Resize', nodes: copied.nodes, edges: copied.edges })
    expect(xml).toContain('width="80" height="40"')
    expect(xml).toContain('width="128" height="128"')
  })

  it('preserves local image and icon geometry during a resize while accepting remote labels', () => {
    const localImage = { ...image, width: 80, height: 40, resizing: true }
    const localIcon = { ...icon, resizing: true, data: { ...icon.data, iconSize: 128 } }
    const merged = mergeRemote({ nodes: [localImage, localIcon], edges: [edge] }, {
      nodes: [image, { ...icon, data: { ...icon.data, label: 'Remote label' } }], edges: [edge],
    })
    expect(mediaSize(merged.nodes[0] as ImageNode)).toEqual({ width: 80, height: 40 })
    expect((merged.nodes[1] as IconNode).data).toMatchObject({ iconSize: 128, label: 'Remote label' })
    const released = mergeRemote({ ...merged, nodes: merged.nodes.map((n) => ({ ...n, resizing: false })) }, { nodes: [image, icon], edges: [edge] })
    expect((released.nodes[1] as IconNode).data.iconSize).toBe(64)
  })
})
