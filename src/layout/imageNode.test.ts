import { describe, expect, it } from 'vitest'
import { applyLayoutResult } from './apply'
import { buildTree, makeBoxes, resolveScope } from './shared'
import { tidy } from './tidy'
import type { AppNode } from '../types'
import { layoutSize } from './sizes'
import { nodeSize } from '../lib/geometry'

const image: AppNode = {
  id: 'image',
  type: 'image',
  position: { x: 13, y: 19 },
  width: 320,
  height: 160,
  data: { label: 'architecture', src: 'data:image/png;base64,AAEC/w==' },
}

describe('image node layout', () => {
  it('reserves caption space without changing the saved artwork dimensions', () => {
    const tree = buildTree([image])
    const boxes = makeBoxes(tree, resolveScope(tree), 64)
    expect(boxes.get('image')).toMatchObject({ kind: 'image', width: 320, height: 181 })
    expect(nodeSize(image)).toEqual({ width: 320, height: 181 })

    const result = tidy([image], [])
    expect(result.groupSizes).not.toHaveProperty('image')
    expect(result.iconSizes).not.toHaveProperty('image')
    const [laidOut] = applyLayoutResult([image], [], result).nodes
    expect(laidOut).toMatchObject({ width: 320, height: 160 })
  })

  it('includes multiline captions, small-image label width and measured wrapping', () => {
    const small = { ...image, width: 32, height: 16, data: { ...image.data, label: 'First\nSecond' } } as AppNode
    expect(layoutSize(small)).toEqual({ width: 96, height: 52 })
    expect(layoutSize({ ...small, measured: { width: 96, height: 67 } })).toEqual({ width: 96, height: 67 })
    expect(layoutSize({ ...small, data: { ...small.data, label: '' } } as AppNode)).toEqual({ width: 96, height: 16 })
    expect(nodeSize({ ...small, measured: { width: 96 } })).toEqual({ width: 96, height: 52 })
  })
})
