import { describe, expect, it } from 'vitest'
import { applyLayoutResult } from './apply'
import { buildTree, makeBoxes, resolveScope } from './shared'
import { tidy } from './tidy'
import type { AppNode } from '../types'

const image: AppNode = {
  id: 'image',
  type: 'image',
  position: { x: 13, y: 19 },
  width: 320,
  height: 160,
  data: { label: 'architecture', src: 'data:image/png;base64,AAEC/w==' },
}

describe('image node layout', () => {
  it('treats images as fixed-size leaves', () => {
    const tree = buildTree([image])
    const boxes = makeBoxes(tree, resolveScope(tree), 64)
    expect(boxes.get('image')).toMatchObject({ kind: 'image', width: 320, height: 160 })

    const result = tidy([image], [])
    expect(result.groupSizes).not.toHaveProperty('image')
    expect(result.iconSizes).not.toHaveProperty('image')
    const [laidOut] = applyLayoutResult([image], [], result).nodes
    expect(laidOut).toMatchObject({ width: 320, height: 160 })
  })
})
