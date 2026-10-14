import { describe, expect, it } from 'vitest'
import { cloneClipboard, copySelection, type ClipboardData } from './clipboard'
import { clipboardText, CLIPBOARD_MIME, CLIPBOARD_PREFIX, parseClipboard, serializeClipboard } from './clipboardFormat'

const selection: ClipboardData = {
  nodes: [
    { id: 'group', type: 'awsGroup', position: { x: 2000, y: 3000 }, width: 400, height: 300, selected: true, data: { groupType: 'generic', label: 'Services' } },
    { id: 'image', type: 'image', parentId: 'group', position: { x: 30, y: 60 }, width: 100, height: 80, data: { label: 'Screenshot', src: 'data:image/png;base64,AAEC/w==' } },
    { id: 'label', type: 'text', parentId: 'group', position: { x: 200, y: 70 }, data: { label: 'Notes', fontSize: 16 } },
  ],
  edges: [{ id: 'arrow', type: 'aws', source: 'image', target: 'label', sourceHandle: 'bottom', targetHandle: 'bottom', selected: true,
    data: { label: 'Request', pathType: 'step', dashed: true, arrows: 'both', elbowOffsets: [60] } }],
}

describe('portable diagram clipboard', () => {
  it('includes group contents, internal arrows and embedded images without UI state', () => {
    const copied = copySelection(selection.nodes, selection.edges)!
    const text = serializeClipboard(copied)
    expect(text).not.toContain('selected')
    expect(text).not.toContain('measured')
    const parsed = parseClipboard(text)
    expect(parsed.nodes).toHaveLength(3)
    expect(parsed.nodes[1]).toMatchObject({ parentId: 'group', data: { src: 'data:image/png;base64,AAEC/w==' } })
    expect(parsed.edges[0]).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'bottom', data: selection.edges[0].data })
    expect(serializeClipboard(copied)).not.toBe(text) // A new copy resets repeated-paste offsets.
  })

  it('supports custom MIME and a plain-text fallback, ignoring ordinary text and HTML', () => {
    const text = serializeClipboard(selection)
    const transfer = (data: Record<string, string>) => ({ getData: (type: string) => data[type] ?? '' })
    expect(clipboardText(transfer({ [CLIPBOARD_MIME]: text }))).toBe(text)
    expect(clipboardText(transfer({ 'text/plain': CLIPBOARD_PREFIX + text }))).toBe(text)
    expect(clipboardText(transfer({ 'text/plain': CLIPBOARD_PREFIX.replace('\n', '\r\n') + text }))).toBe(text)
    expect(clipboardText(transfer({ 'text/plain': 'Hello', 'text/html': '<img src="https://example.com/image.png">' }))).toBeNull()
  })

  it('centres a far-away selection at the destination and remaps all IDs without changing relative positions', () => {
    const parsed = parseClipboard(serializeClipboard(selection))
    const pasted = cloneClipboard(parsed, 0, { x: 500, y: 500 })
    expect(pasted.nodes[0].position).toEqual({ x: 300, y: 350 })
    expect(pasted.nodes[1].position).toEqual({ x: 30, y: 60 })
    expect(pasted.nodes[1].parentId).toBe(pasted.nodes[0].id)
    expect(pasted.edges[0].source).toBe(pasted.nodes[1].id)
    expect(pasted.edges[0].target).toBe(pasted.nodes[2].id)
    expect(pasted.nodes.every((node) => !parsed.nodes.some((old) => old.id === node.id))).toBe(true)
    expect(pasted.edges[0].id).not.toBe('arrow')
    expect(parsed.nodes[0].position).toEqual({ x: 2000, y: 3000 })
  })

  it('copies a child without its parent at its absolute position, excluding unrelated arrows', () => {
    const nodes = selection.nodes.map((node) => ({ ...node, selected: node.id === 'image' }))
    const copied = copySelection(nodes, selection.edges)!
    expect(copied.nodes).toHaveLength(1)
    expect(copied.nodes[0].parentId).toBeUndefined()
    expect(copied.nodes[0].position).toEqual({ x: 2030, y: 3060 })
    expect(copied.edges).toHaveLength(0)
  })

  it('rejects broken data, unknown versions and remote image URLs', () => {
    expect(() => parseClipboard('{')).toThrow()
    expect(() => parseClipboard(JSON.stringify({ ...selection, app: 'other', kind: 'selection', version: 1 }))).toThrow('format')
    const raw = JSON.parse(serializeClipboard(selection))
    expect(() => parseClipboard(JSON.stringify({ ...raw, version: 999 }))).toThrow('format')
    raw.nodes[1].data.src = 'https://example.com/image.png'
    expect(() => parseClipboard(JSON.stringify(raw))).toThrow('invalid embedded image')
  })

  it('rejects cyclic groups before they can reach diagram geometry', () => {
    const first = { ...selection.nodes[0], parentId: 'second' }
    const second = { ...selection.nodes[0], id: 'second', parentId: 'group' }
    expect(() => parseClipboard(serializeClipboard({ nodes: [first, second], edges: [] }))).toThrow('cyclic groups')
  })
})
