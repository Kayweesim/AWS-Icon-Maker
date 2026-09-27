import { describe, expect, it } from 'vitest'
import type { AppNode } from '../types'
import { parseDiagram, toFile } from './persistence'

const src = 'data:image/png;base64,AAEC/w=='

describe('custom image persistence', () => {
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

    const parsed = parseDiagram(toFile({ name: 'Images', nodes, edges: [] }))
    expect(parsed.nodes[1]).toEqual({
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
