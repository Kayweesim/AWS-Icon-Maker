import { DRAG_MIME } from '../types'

const SAFE_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])
const SVG_MIME = 'image/svg+xml'
export const IMAGE_DROP_FORMATS = 'PNG, JPG, SVG, GIF, WebP or AVIF'
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: SVG_MIME,
}

const MIN_LONGEST_SIDE = 96
const MAX_LONGEST_SIDE = 320

type FileLike = Pick<File, 'name' | 'size' | 'type'>
type DragItemLike = Pick<DataTransferItem, 'kind' | 'type'>
type DataTransferLike = {
  types: ArrayLike<string>
  items?: ArrayLike<DragItemLike>
  files?: ArrayLike<File>
}

export type PreparedImage = { name: string; src: string; width: number; height: number }

export function imageMimeType(file: Pick<FileLike, 'name' | 'type'>): string | null {
  const declared = file.type.toLowerCase()
  if (SAFE_IMAGE_MIME_TYPES.has(declared) || declared === SVG_MIME) return declared
  const extension = file.name.match(/\.([^.]+)$/)?.[1].toLowerCase()
  return extension ? (MIME_BY_EXTENSION[extension] ?? null) : null
}

export const isSupportedImageFile = (file: FileLike) => file.size > 0 && imageMimeType(file) !== null

/** File names/bytes may be hidden during dragover (notably for Finder/Safari drags).
 * Accept file drags here and validate after drop, when the actual File is available. */
export function acceptsCanvasDrop(transfer: DataTransferLike): boolean {
  const types = Array.from(transfer.types)
  return types.includes(DRAG_MIME) || types.includes('Files') ||
    Array.from(transfer.items ?? []).some((item) => item.kind === 'file')
}

export function firstDroppedImage(transfer: Pick<DataTransferLike, 'files'>): File | null {
  return Array.from(transfer.files ?? []).find(isSupportedImageFile) ?? null
}

/** Screenshots may be exposed as clipboard items rather than a populated FileList. */
export function firstPastedImage(transfer: Pick<DataTransfer, 'files' | 'items'>): File | null {
  const file = firstDroppedImage(transfer)
  if (file) return file
  for (const item of Array.from(transfer.items)) {
    if (item.kind !== 'file') continue
    const candidate = item.getAsFile()
    if (candidate && isSupportedImageFile(candidate)) return candidate
  }
  return null
}

export function imageName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '').trim()
  return withoutExtension || 'Image'
}

/** Fit a decoded image into the canvas without changing its aspect ratio. */
export function fitImageSize(naturalWidth: number, naturalHeight: number): { width: number; height: number } {
  if (!(naturalWidth > 0) || !(naturalHeight > 0)) return { width: 160, height: 160 }
  const longest = Math.max(naturalWidth, naturalHeight)
  const target = Math.min(MAX_LONGEST_SIDE, Math.max(MIN_LONGEST_SIDE, longest))
  const scale = target / longest
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export async function imageFileToDataUrl(file: File): Promise<string> {
  let mimeType = imageMimeType(file)
  if (!mimeType || file.size === 0) throw new Error(`Choose a non-empty ${IMAGE_DROP_FORMATS} image`)
  if (file.size > MAX_FILE_BYTES) throw new Error('Image is too large. Choose a file smaller than 20 MB')
  const bytes = new Uint8Array(await file.arrayBuffer())
  // Renaming an SVG to .jpg does not convert it. Honour the actual SVG content as well.
  const header = new TextDecoder().decode(bytes.subarray(0, 4096)).trimStart()
  if (header.startsWith('<') && /<svg[\s>]/i.test(header)) mimeType = SVG_MIME
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode this image. Try exporting it as PNG or JPG'))
    image.src = src
  })
}

export async function prepareDroppedImage(file: File): Promise<PreparedImage> {
  let src = await imageFileToDataUrl(file)
  const image = await decodeImage(src)
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('This image has no visible dimensions')
  if (src.startsWith(`data:${SVG_MIME};`)) {
    // SVG is decoded in an <img> (scripts/external resources disabled), never inserted as HTML.
    // Store only its rasterised pixels so JSON and shared rooms remain safe and self-contained.
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare this SVG. Try exporting it as PNG')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    src = canvas.toDataURL('image/png')
  }
  return { name: imageName(file.name), src, ...fitImageSize(image.naturalWidth, image.naturalHeight) }
}

/** Strict format accepted from saved files and collaboration payloads. */
export function isEmbeddedImageDataUrl(value: string): boolean {
  const comma = value.indexOf(',')
  if (comma < 0) return false
  const header = value.slice(0, comma).toLowerCase()
  const mimeType = header.match(/^data:(image\/[a-z0-9.+-]+);base64$/)?.[1]
  if (!mimeType || !SAFE_IMAGE_MIME_TYPES.has(mimeType)) return false
  const payload = value.slice(comma + 1)
  return payload.length > 0 && payload.length % 4 === 0 && /^[a-z0-9+/]*={0,2}$/i.test(payload)
}
