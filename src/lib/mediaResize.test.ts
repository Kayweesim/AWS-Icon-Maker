import { describe, expect, it } from 'vitest'
import { iconNodeWidth } from '../layout/sizes'
import type { IconNode, ImageNode } from '../types'
import { cornerSize, mediaSize, proportionalSize, resizeMediaNode } from './mediaResize'

const image: ImageNode = { id: 'image', type: 'image', position: { x: 100, y: 200 }, width: 320, height: 160, data: { label: 'Logo', src: 'data:image/png;base64,AAEC/w==' } }
const icon: IconNode = { id: 'icon', type: 'icon', position: { x: 100, y: 200 }, data: { iconSize: 64, iconId: 'test', iconPath: '/aws-icons/test.svg', label: 'Service' } }

describe('proportional media resizing', () => {
  it('links either dimension while keeping the aspect ratio', () => {
    expect(proportionalSize(mediaSize(image), 80, 'width', 'image')).toEqual({ width: 80, height: 40 })
    expect(proportionalSize(mediaSize(image), 40, 'height', 'image')).toEqual({ width: 80, height: 40 })
    expect(proportionalSize(mediaSize(image), 8192, 'height', 'image')).toEqual({ width: 4096, height: 2048 })
    expect(proportionalSize(mediaSize(image), 0, 'width', 'image')).toEqual({ width: 2, height: 1 })
    expect(proportionalSize(mediaSize(image), NaN, 'width', 'image')).toEqual(mediaSize(image))
  })

  it('handles horizontal or vertical drags from all four corners', () => {
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      const direction = { x, y }
      expect(cornerSize(mediaSize(image), { x: 80 * x, y: 0 }, direction, 'image')).toEqual({ width: 400, height: 200 })
      expect(cornerSize(mediaSize(image), { x: 0, y: 40 * y }, direction, 'image')).toEqual({ width: 400, height: 200 })
      expect(cornerSize(mediaSize(icon), { x: -1000 * x, y: 0 }, direction, 'icon')).toEqual({ width: 16, height: 16 })
    }
  })

  it('resizes an image about its centre by default', () => {
    const resized = resizeMediaNode(image, { width: 80, height: 40 })
    expect(resized.position).toEqual({ x: 220, y: 260 })
    expect(mediaSize(resized)).toEqual({ width: 80, height: 40 })
    expect(resized.data).toBe(image.data)
  })

  it('keeps the opposite image corner fixed including inside a group', () => {
    for (const x of [0, 1]) for (const y of [0, 1]) {
      const resized = resizeMediaNode({ ...image, parentId: 'group' }, { width: 400, height: 200 }, { x, y })
      expect(resized.position.x + 400 * x).toBe(image.position.x + 320 * x)
      expect(resized.position.y + 200 * y).toBe(image.position.y + 160 * y)
      expect(resized.parentId).toBe('group')
    }
  })

  it('keeps an icon artwork corner fixed across the label-width threshold', () => {
    for (const size of [32, 80, 128, 256]) for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
      const resized = resizeMediaNode(icon, { width: size, height: size }, { x, y })
      const leftBefore = icon.position.x + (iconNodeWidth(64) - 64) / 2
      const leftAfter = resized.position.x + (iconNodeWidth(size) - size) / 2
      expect(leftAfter + size * x).toBe(leftBefore + 64 * x)
      expect(resized.position.y + size * y).toBe(icon.position.y + 64 * y)
      expect(resized.data.label).toBe('Service')
    }
  })

  it('updates cached dimensions without stretching icon labels', () => {
    const resized = resizeMediaNode({ ...icon, measured: { width: 96, height: 100 } }, { width: 128, height: 128 })
    expect(resized.measured).toEqual({ width: 128, height: 164 })
    const resizedImage = resizeMediaNode({ ...image, measured: { width: 320, height: 160 } }, { width: 80, height: 40 })
    expect(resizedImage.measured).toEqual({ width: 80, height: 40 })
  })

  it('clamps geometry to persistence limits and rejects non-finite edits', () => {
    expect(mediaSize(resizeMediaNode(icon, { width: 600, height: 40 }))).toEqual({ width: 256, height: 256 })
    expect(mediaSize(resizeMediaNode(image, { width: 5000, height: -10 }))).toEqual({ width: 4096, height: 1 })
    expect(resizeMediaNode(image, { width: NaN, height: 10 })).toBe(image)
    expect(resizeMediaNode(icon, { width: Infinity, height: 40 })).toBe(icon)
    expect(resizeMediaNode(icon, { width: 64, height: 64 })).toBe(icon)
  })
})
