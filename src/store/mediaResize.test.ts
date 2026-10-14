import { beforeEach, describe, expect, it } from 'vitest'
import { mergeRemote } from '../collab/merge'
import { exportDrawio } from '../exporters/drawio'
import { copySelection } from '../lib/clipboard'
import { parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { wholeDiagram } from '../lib/document'
import { mediaSize } from '../lib/mediaResize'
import { newPage, parseDiagram, toFile } from '../lib/persistence'
import type { AppEdge, GroupNode, IconNode, ImageNode } from '../types'
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

  it.each(['duplicate', 'copy/paste', 'portable paste'] as const)('preserves each icon size and image caption through %s, including group children', (action) => {
    const sizes = [16, 32, 48, 64, 100, 128, 256]
    const group: GroupNode = { id: 'group', type: 'awsGroup', position: { x: 0, y: 0 }, width: 1800, height: 500, selected: true, data: { label: 'Services', groupType: 'generic' } }
    const icons = sizes.map((size, index) => ({ ...icon, id: `icon-${size}`, parentId: 'group', selected: false, position: { x: index * 220, y: 80 }, data: { ...icon.data, iconSize: size } }))
    state().loadDiagram({ pages: [newPage('Original', { nodes: [group, ...icons, { ...image, data: { ...image.data, label: 'github\nRepository' } }], edges: [] })] })
    const originalIds = new Set(state().nodes.map((node) => node.id))
    if (action === 'duplicate') state().duplicate()
    else if (action === 'copy/paste') {
      state().copy()
      state().addPage()
      state().paste()
    } else {
      const clipboard = parseClipboard(serializeClipboard(copySelection(state().nodes, state().edges)!))
      state().loadDiagram({ pages: [newPage('Destination')] })
      state().paste(clipboard, { x: 1000, y: 500 })
    }
    const copies = state().nodes.filter((node) => !originalIds.has(node.id))
    expect(copies.filter((node) => node.type === 'icon').map((node) => node.data.iconSize)).toEqual(sizes)
    expect(copies.find((node) => node.type === 'image')).toMatchObject({ width: 320, height: 160, data: { label: 'github\nRepository' } })
    expect(copies.filter((node) => node.type === 'icon').every((node) => node.parentId === copies.find((node) => node.type === 'awsGroup')?.id)).toBe(true)
    state().undo()
    expect(state().nodes.some((node) => copies.some((copy) => copy.id === node.id))).toBe(false)
    state().redo()
    expect(state().nodes.filter((node) => !originalIds.has(node.id) && node.type === 'icon').map((node) => node.data.iconSize)).toEqual(sizes)
  })

  it('edits image captions and arrow descriptions as undoable, portable data', () => {
    state().updateNodeData('image', { label: 'github\nSource code' })
    state().updateEdgesData(['edge'], { label: 'HTTPS', description: 'Fetch source\nfrom the repository' })
    const parsed = parseDiagram(toFile(wholeDiagram(state())))
    expect(parsed.pages[0].nodes[0].data.label).toBe('github\nSource code')
    expect(parsed.pages[0].edges[0].data).toMatchObject({ label: 'HTTPS', description: 'Fetch source\nfrom the repository' })
    const copied = parseClipboard(serializeClipboard(copySelection(state().nodes, state().edges)!))
    expect(copied.nodes[0].data.label).toBe('github\nSource code')
    expect(copied.edges[0].data).toMatchObject({ label: 'HTTPS', description: 'Fetch source\nfrom the repository' })
    state().undo()
    expect(state().edges[0].data?.label).toBe('')
    expect(state().edges[0].data?.description).toBeUndefined()
    state().undo()
    expect(state().nodes[0].data.label).toBe('Logo')
    state().redo()
    state().redo()
    expect(state().edges[0].data).toMatchObject({ label: 'HTTPS', description: 'Fetch source\nfrom the repository' })
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
