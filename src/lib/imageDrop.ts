import { DRAG_MIME } from '../types'

const SAFE_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
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
  if (SAFE_IMAGE_MIME_TYPES.has(declared)) return declared
  const extension = file.name.match(/\.([^.]+)$/)?.[1].toLowerCase()
  return extension ? (MIME_BY_EXTENSION[extension] ?? null) : null
}

export const isSupportedImageFile = (file: FileLike) => file.size > 0 && imageMimeType(file) !== null

/** Whether a drag should get the canvas' copy drop target. Palette drags keep their existing path. */
export function acceptsCanvasDrop(transfer: DataTransferLike): boolean {
  const types = Array.from(transfer.types)
  if (types.includes(DRAG_MIME)) return true
  if (!types.includes('Files')) return false
  const items = Array.from(transfer.items ?? [])
  if (items.length === 0) return true
  return items.some((item) => item.kind === 'file' && (!item.type || SAFE_IMAGE_MIME_TYPES.has(item.type.toLowerCase())))
}

export function firstDroppedImage(transfer: Pick<DataTransferLike, 'files'>): File | null {
  return Array.from(transfer.files ?? []).find(isSupportedImageFile) ?? null
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
  const mimeType = imageMimeType(file)
  if (!mimeType || file.size === 0) throw new Error('Unsupported image file')
  return `data:${mimeType};base64,${bytesToBase64(new Uint8Array(await file.arrayBuffer()))}`
}

function decodedSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('Could not read image dimensions'))
    image.src = src
  })
}

export async function prepareDroppedImage(file: File): Promise<PreparedImage> {
  const src = await imageFileToDataUrl(file)
  const natural = await decodedSize(src)
  return { name: imageName(file.name), src, ...fitImageSize(natural.width, natural.height) }
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
