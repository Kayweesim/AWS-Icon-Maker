import type { XYPosition } from '@xyflow/react'
import { MAX_ICON_SIZE, MAX_IMAGE_SIZE, MIN_ICON_SIZE, MIN_IMAGE_SIZE } from '../layout/config'
import { iconNodeWidth, iconSizeOf } from '../layout/sizes'
import type { IconNode, ImageNode } from '../types'

export type MediaNode = IconNode | ImageNode
export type MediaSize = { width: number; height: number }
/** Fraction of the artwork to keep fixed: centre (.5,.5), top-left (0,0), etc. */
export type ResizeAnchor = { x: number; y: number }
const CENTRE = { x: 0.5, y: 0.5 }

export const mediaSize = (node: MediaNode): MediaSize => node.type === 'icon'
  ? { width: iconSizeOf(node), height: iconSizeOf(node) }
  : { width: node.width ?? 160, height: node.height ?? 160 }

export const mediaLimits = (type: MediaNode['type']) => type === 'icon'
  ? { min: MIN_ICON_SIZE, max: MAX_ICON_SIZE }
  : { min: MIN_IMAGE_SIZE, max: MAX_IMAGE_SIZE }

/** Both numeric fields and corner drags preserve proportions, bounded by the saved-file limits. */
export function proportionalSize(size: MediaSize, requested: number, axis: keyof MediaSize, type: MediaNode['type']): MediaSize {
  if (!Number.isFinite(requested)) return size
  const { min, max } = mediaLimits(type)
  const scale = Math.max(Math.max(min / size.width, min / size.height),
    Math.min(requested / size[axis], Math.min(max / size.width, max / size.height)))
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) }
}

export function cornerSize(size: MediaSize, delta: XYPosition, direction: XYPosition, type: MediaNode['type']): MediaSize {
  const horizontal = delta.x * direction.x / size.width
  const vertical = delta.y * direction.y / size.height
  const scale = 1 + (Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical)
  return proportionalSize(size, size.width * scale, 'width', type)
}

/** Update artwork geometry without resizing an icon's label or moving the opposite corner. */
export function resizeMediaNode(node: MediaNode, requested: MediaSize, anchor: ResizeAnchor = CENTRE): MediaNode {
  if (![requested.width, requested.height, anchor.x, anchor.y].every(Number.isFinite)) return node
  const before = mediaSize(node), { min, max } = mediaLimits(node.type)
  const width = Math.max(min, Math.min(max, Math.round(requested.width)))
  const height = node.type === 'icon' ? width : Math.max(min, Math.min(max, Math.round(requested.height)))
  if (before.width === width && before.height === height) return node
  const beforeInset = node.type === 'icon' ? (iconNodeWidth(before.width) - before.width) / 2 : 0
  const afterInset = node.type === 'icon' ? (iconNodeWidth(width) - width) / 2 : 0
  const position = {
    x: node.position.x + beforeInset - afterInset + (before.width - width) * anchor.x,
    y: node.position.y + (before.height - height) * anchor.y,
  }
  if (node.type === 'icon') return {
    ...node, position, data: { ...node.data, iconSize: width },
    // Keep cached geometry consistent until React Flow's ResizeObserver measures the DOM.
    measured: node.measured ? { width: iconNodeWidth(width), height: (node.measured.height ?? before.height) + height - before.height } : undefined,
  }
  return { ...node, position, width, height, measured: node.measured ? { width, height } : undefined }
}
