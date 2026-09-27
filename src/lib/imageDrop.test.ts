import { describe, expect, it } from 'vitest'
import { DRAG_MIME } from '../types'
import {
  acceptsCanvasDrop,
  firstDroppedImage,
  fitImageSize,
  imageFileToDataUrl,
  imageMimeType,
  imageName,
  isEmbeddedImageDataUrl,
} from './imageDrop'

describe('image drops', () => {
  it('accepts palette and image-file drags without claiming known non-image files', () => {
    expect(acceptsCanvasDrop({ types: [DRAG_MIME] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'], items: [{ kind: 'file', type: 'image/png' }] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'], items: [{ kind: 'file', type: 'text/plain' }] })).toBe(false)
    expect(acceptsCanvasDrop({ types: ['text/plain'] })).toBe(false)
  })

  it('selects the first supported image and can infer a missing MIME type', () => {
    const text = new File(['notes'], 'notes.txt', { type: 'text/plain' })
    const image = new File([new Uint8Array([1, 2, 3])], 'diagram.PNG')
    expect(firstDroppedImage({ files: [text, image] })).toBe(image)
    expect(imageMimeType(image)).toBe('image/png')
    expect(firstDroppedImage({ files: [text] })).toBeNull()
  })

  it('derives a readable name and fits dimensions without changing aspect ratio', () => {
    expect(imageName('system.context.png')).toBe('system.context')
    expect(imageName('.png')).toBe('Image')
    expect(fitImageSize(1600, 800)).toEqual({ width: 320, height: 160 })
    expect(fitImageSize(24, 12)).toEqual({ width: 96, height: 48 })
  })

  it('embeds bytes in a validated data URL', async () => {
    const file = new File([new Uint8Array([0, 1, 2, 255])], 'pixel.png', { type: 'image/png' })
    const src = await imageFileToDataUrl(file)
    expect(src).toBe('data:image/png;base64,AAEC/w==')
    expect(isEmbeddedImageDataUrl(src)).toBe(true)
    expect(isEmbeddedImageDataUrl('data:text/html;base64,PHNjcmlwdD4=' )).toBe(false)
    expect(isEmbeddedImageDataUrl('https://example.com/image.png')).toBe(false)
  })
})
