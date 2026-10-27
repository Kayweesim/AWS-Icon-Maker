import { beforeEach, describe, expect, it } from 'vitest'
import { mergeRemote } from '../collab/merge'
import { copySelection } from '../lib/clipboard'
import { parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { wholeDiagram } from '../lib/document'
import { newPage, parseDiagram, toFile } from '../lib/persistence'
import type { AppEdge, AppNode } from '../types'
import { useDiagramStore } from './diagramStore'

const state = () => useDiagramStore.getState()
const nodes: AppNode[] = [
  { id: 'icon', type: 'icon', selected: true, position: { x: 0, y: 0 }, data: { label: 'Service', iconId: 'test', iconPath: '/aws-icons/test.svg', iconSize: 100 } },
  { id: 'text', type: 'text', selected: true, position: { x: 200, y: 0 }, data: { label: 'Text', fontSize: 18 } },
  { id: 'image', type: 'image', selected: true, position: { x: 400, y: 0 }, width: 100, height: 50, data: { label: 'github', src: 'data:image/png;base64,AAEC/w==' } },
  { id: 'group', type: 'awsGroup', position: { x: 0, y: 300 }, width: 400, height: 200, data: { label: 'Group', groupType: 'vpc' } },
]
const edge: AppEdge = { id: 'arrow', type: 'aws', source: 'icon', target: 'text', selected: true, sourceHandle: 'bottom', targetHandle: 'bottom', data: { label: 'API', description: 'Notes', dashed: true, pathType: 'step', arrows: 'both', elbowOffsets: [60] } }
const formatting = { bold: true, underline: true, textColor: '#2563eb' }

describe('arrow and text styling', () => {
  beforeEach(() => {
    state().endHistoryBatch()
    state().loadDiagram({ pages: [newPage('Styles', { nodes, edges: [edge] })] })
  })

  it('formats mixed selections in one undo step without touching unselected content', () => {
    const original = state().nodes
    state().setTextFormatting(['icon', 'text', 'image'], ['arrow'], formatting)
    expect(state().past).toHaveLength(1)
    for (const node of state().nodes.filter((node) => node.id !== 'group')) expect(node.data).toMatchObject(formatting)
    expect(state().nodes.find((node) => node.id === 'group')).toBe(original.find((node) => node.id === 'group'))
    expect(state().edges[0].data).toMatchObject({ ...edge.data, ...formatting })
    state().setTextFormatting(['icon', 'text', 'image'], ['arrow'], formatting)
    state().setTextFormatting(['missing'], ['missing'], formatting)
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().nodes).toEqual(original)
    expect(state().edges).toEqual([edge])
    state().redo()
    expect(state().edges[0].data).toMatchObject(formatting)
  })

  it('keeps labels, descriptions, bends, arrowheads and text styling when changing arrow appearance', () => {
    state().setTextFormatting([], ['arrow'], formatting)
    state().updateEdgesData(['arrow'], { strokeColor: '#dc2626', strokeWidth: 4.5 })
    expect(state().edges[0].data).toEqual({ ...edge.data, ...formatting, strokeColor: '#dc2626', strokeWidth: 4.5 })
    state().pickArrowPreset('data-flow')
    expect(state().edges[0].data).toMatchObject({ ...formatting, strokeColor: '#dc2626', strokeWidth: 4.5, description: 'Notes' })
    state().updateEdgesData(['arrow'], { strokeColor: undefined, strokeWidth: undefined })
    expect(state().edges[0].data).toMatchObject(formatting)
    state().undo()
    expect(state().edges[0].data?.strokeWidth).toBe(4.5)
  })

  it('preserves formatting through duplicate, portable copy/paste, JSON and shared documents', () => {
    state().setTextFormatting(nodes.map((node) => node.id), ['arrow'], formatting)
    state().updateEdgesData(['arrow'], { strokeColor: '#dc2626', strokeWidth: 4.5 })
    state().selectAll()
    const original = state().nodes
    state().duplicate()
    const duplicates = state().nodes.filter((node) => !original.some((old) => old.id === node.id))
    expect(duplicates).toHaveLength(4)
    for (const node of duplicates) expect(node.data).toMatchObject(formatting)
    expect(state().edges.at(-1)?.data?.strokeWidth).toBe(4.5)
    const copied = parseClipboard(serializeClipboard(copySelection(state().nodes, state().edges)!))
    state().addPage()
    state().paste(copied)
    for (const node of state().nodes) expect(node.data).toMatchObject(formatting)
    const parsed = parseDiagram(JSON.parse(JSON.stringify(toFile(wholeDiagram(state())))))
    const merged = mergeRemote({ nodes: [], edges: [] }, parsed.pages.at(-1)!)
    expect(merged.nodes.every((node) => node.data.bold && node.data.underline && node.data.textColor === '#2563eb')).toBe(true)
    expect(merged.edges[0].data).toMatchObject({ ...formatting, strokeWidth: 4.5, strokeColor: '#dc2626' })
  })

  it('resets text formatting independently of arrow appearance and persists explicit false values', () => {
    state().updateEdgesData(['arrow'], { ...formatting, strokeColor: '#dc2626', strokeWidth: 4 })
    state().setTextFormatting([], ['arrow'], { bold: false, underline: false })
    expect(parseDiagram(toFile(wholeDiagram(state()))).pages[0].edges[0].data).toMatchObject({ bold: false, underline: false, strokeWidth: 4 })
    state().setTextFormatting([], ['arrow'], { bold: undefined, underline: undefined, textColor: undefined })
    const data = parseDiagram(toFile(wholeDiagram(state()))).pages[0].edges[0].data
    expect(data?.textColor).toBeUndefined()
    expect(data?.bold).toBeUndefined()
    expect(data?.strokeColor).toBe('#dc2626')
  })

  it('ignores malformed formatting and preserves legacy defaults when importing', () => {
    const malformed = { bold: 'yes', underline: 1, textColor: '#fff;strokeColor=red', strokeColor: 'url(https://example.com)', strokeWidth: 1000 }
    const parsed = parseDiagram({ nodes: nodes.map((node) => ({ ...node, data: { ...node.data, ...malformed } })), edges: [{ ...edge, data: { ...edge.data, ...malformed } }] })
    for (const node of parsed.pages[0].nodes) {
      expect(node.data.bold).toBeUndefined()
      expect(node.data.underline).toBeUndefined()
      expect(node.data.textColor).toBeUndefined()
    }
    expect(parsed.pages[0].edges[0].data).toEqual(edge.data)
  })
})
