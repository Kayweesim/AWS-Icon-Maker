import { describe, expect, it } from 'vitest'
import type { AppNode } from '../types'
import { newPage, parseDiagram, toFile } from './persistence'

const src = 'data:image/png;base64,AAEC/w=='

describe('custom image persistence', () => {
  it.each(['', 'github', 'GitHub\nSource code'])('preserves an explicitly edited image caption %j', (label) => {
    const diagram = parseDiagram({ nodes: [{ id: 'image', type: 'image', position: { x: 0, y: 0 }, width: 80, height: 40, data: { label, src } }], edges: [] })
    expect(parseDiagram(toFile(diagram)).pages[0].nodes[0].data.label).toBe(label)
  })

  it('round-trips an embedded image with its size and parent', () => {
    const nodes: AppNode[] = [
      {
        id: 'group',
        type: 'awsGroup',
        position: { x: 10, y: 20 },
        width: 400,
        height: 300,
        data: { label: 'Group', groupType: 'generic' },
      },
      {
        id: 'image',
        type: 'image',
        position: { x: 40, y: 50 },
        parentId: 'group',
        width: 320,
        height: 160,
        selected: true,
        data: { label: 'architecture', src },
      },
    ]

    const parsed = parseDiagram(toFile({ name: 'Images', pages: [newPage('Page 1', { nodes, edges: [] })] }))
    expect(parsed.pages[0].nodes[1]).toEqual({
      id: 'image',
      type: 'image',
      position: { x: 40, y: 50 },
      parentId: 'group',
      width: 320,
      height: 160,
      data: { label: 'architecture', src },
    })
  })

  it.each(['https://example.com/image.png', 'blob:https://example.com/id', 'data:text/html;base64,PHNjcmlwdD4='])(
    'rejects an unsafe image source: %s',
    (unsafe) => {
      expect(() =>
        parseDiagram({
          nodes: [{ id: 'image', type: 'image', position: { x: 0, y: 0 }, width: 100, height: 100, data: { label: 'x', src: unsafe } }],
          edges: [],
        }),
      ).toThrow('invalid embedded image')
    },
  )

  it('rejects missing or unreasonable dimensions', () => {
    expect(() =>
      parseDiagram({
        nodes: [{ id: 'image', type: 'image', position: { x: 0, y: 0 }, width: 0, height: 100, data: { label: 'x', src } }],
        edges: [],
      }),
    ).toThrow('invalid image dimensions')
  })
})

describe('arrow descriptions', () => {
  it('keeps optional notes separate from the displayed label and accepts older diagrams', () => {
    const nodes = [
      { id: 'a', type: 'image', position: { x: 0, y: 0 }, width: 100, height: 100, data: { label: 'a', src } },
      { id: 'b', type: 'image', position: { x: 200, y: 0 }, width: 100, height: 100, data: { label: 'b', src } },
    ]
    for (const description of [undefined, '', 'Fetch code\nover HTTPS', { unsafe: true }]) {
      const parsed = parseDiagram({ nodes, edges: [{ id: 'edge', source: 'a', target: 'b', data: { label: 'HTTPS', description } }] })
      const data = parseDiagram(toFile(parsed)).pages[0].edges[0].data
      expect(data?.label).toBe('HTTPS')
      expect(data?.description).toBe(typeof description === 'string' ? description : undefined)
    }
  })
})
