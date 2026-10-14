import { describe, expect, it } from 'vitest'
import { DRAG_MIME } from '../types'
import {
  acceptsCanvasDrop,
  firstDroppedImage,
  firstPastedImage,
  fitImageSize,
  imageFileToDataUrl,
  imageMimeType,
  imageName,
  isEmbeddedImageDataUrl,
} from './imageDrop'

describe('image drops', () => {
  it('reads a clipboard screenshot without needing a filename extension', () => {
    const image = new File(['pixels'], 'image', { type: 'image/png' })
    const transfer = { files: [image], items: [] } as unknown as DataTransfer
    expect(firstPastedImage(transfer)).toBe(image)
  })

  it('falls back to clipboard file items and ignores HTML or text', () => {
    const image = new File(['pixels'], 'image.png', { type: 'image/png' })
    const items = [
      { kind: 'string', type: 'text/html', getAsFile: () => null },
      { kind: 'file', type: 'image/png', getAsFile: () => image },
    ]
    expect(firstPastedImage({ files: [], items } as unknown as DataTransfer)).toBe(image)
    expect(firstPastedImage({ files: [], items: items.slice(0, 1) } as unknown as DataTransfer)).toBeNull()
    expect(firstPastedImage({ files: [], items: [{ kind: 'file', getAsFile: () => null }] } as unknown as DataTransfer)).toBeNull()
  })

  it('accepts file drags before validating their contents on drop', () => {
    expect(acceptsCanvasDrop({ types: [DRAG_MIME] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'], items: [{ kind: 'file', type: 'image/png' }] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'], items: [{ kind: 'file', type: 'text/plain' }] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['Files'], items: [{ kind: 'file', type: 'application/octet-stream' }] })).toBe(true)
    expect(acceptsCanvasDrop({ types: [], items: [{ kind: 'file', type: '' }] })).toBe(true)
    expect(acceptsCanvasDrop({ types: ['text/plain'] })).toBe(false)
  })

  it('accepts SVG files including generic Finder MIME types', () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'diagram.svg', { type: 'application/octet-stream' })
    expect(firstDroppedImage({ files: [svg] })).toBe(svg)
    expect(imageMimeType(svg)).toBe('image/svg+xml')
  })

  it('detects SVG contents even if the extension was changed to JPG', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'diagram.jpg', { type: 'image/jpeg' })
    expect(await imageFileToDataUrl(file)).toMatch(/^data:image\/svg\+xml;base64,/)
    // Only the rasterised result may enter persisted/shared documents.
    expect(isEmbeddedImageDataUrl(await imageFileToDataUrl(file))).toBe(false)
  })

  it('rejects oversized and empty files before decoding', async () => {
    const oversized = { name: 'large.png', type: 'image/png', size: 21 * 1024 * 1024 } as File
    await expect(imageFileToDataUrl(oversized)).rejects.toThrow('20 MB')
    await expect(imageFileToDataUrl(new File([], 'empty.png'))).rejects.toThrow('non-empty')
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
    expect(imageName('github.jpg')).toBe('github')
    expect(imageName('github.logo.SVG')).toBe('github.logo')
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
