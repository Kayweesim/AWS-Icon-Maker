import { groupStyle } from '../data/groups'
import type { AppNode, IconNode, ImageNode } from '../types'
import {
  GROUP_LABEL_LINE_HEIGHT,
  GROUP_LABEL_MAX_WIDTH,
  LABEL_CHAR_WIDTH,
  LABEL_GAP,
  LABEL_LINE_HEIGHT,
  LABEL_WIDTH,
  LEGACY_ICON_SIZE,
  TEXT_FONT_SIZE,
  TEXT_LINE_HEIGHT,
  TEXT_MAX_WIDTH,
  TEXT_PADDING,
} from './config'

export function iconSizeOf(node: IconNode): number {
  const size = node.data?.iconSize
  return typeof size === 'number' && size > 0 ? size : LEGACY_ICON_SIZE
}

export const iconNodeWidth = (iconSize: number) => Math.max(iconSize, LABEL_WIDTH)
export const imageNodeWidth = (imageWidth: number) => Math.max(imageWidth, LABEL_WIDTH)
/** Image width/height in saved documents always describe the artwork, excluding its caption. */
export const imageSizeOf = (node: ImageNode) => ({ width: node.width ?? 160, height: node.height ?? 160 })

export function estimateLabelHeight(label: string, bold = false): number {
  if (!label) return 0
  const lines = label
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil((line.length * LABEL_CHAR_WIDTH * (bold ? 1.1 : 1)) / LABEL_WIDTH)), 0)
  return lines * LABEL_LINE_HEIGHT
}

function labelHeight(node: IconNode | ImageNode): number {
  const label = node.data?.label ?? ''
  if (!label) return 0
  // A fixed-width caption keeps its height when the artwork is resized.
  const measured = node.measured?.height
  if (measured) return Math.max(LABEL_LINE_HEIGHT, measured - (node.type === 'icon' ? iconSizeOf(node) : imageSizeOf(node).height) - LABEL_GAP)
  return estimateLabelHeight(label, node.data.bold)
}

/** Approximate size of a text box before it has been rendered. */
export function estimateTextSize(label: string, fontSize = TEXT_FONT_SIZE, bold = false) {
  const charWidth = fontSize * (bold ? 0.6 : 0.55)
  const maxInner = TEXT_MAX_WIDTH - TEXT_PADDING.x * 2
  let widest = 0
  let lines = 0
  for (const line of (label || ' ').split('\n')) {
    const width = Math.max(1, line.length) * charWidth
    widest = Math.max(widest, Math.min(width, maxInner))
    lines += Math.max(1, Math.ceil(width / maxInner))
  }
  return {
    width: Math.ceil(widest + TEXT_PADDING.x * 2),
    height: Math.ceil(lines * fontSize * TEXT_LINE_HEIGHT + TEXT_PADDING.y * 2),
  }
}

// Horizontal space taken by the group icon and label insets (see GroupNode).
const labelChrome = (hasIcon: boolean) => (hasIcon ? 40 : 8) + 8

/**
 * How a group label lays out: the width that fits it on one line (capped, so very long labels
 * wrap), and the header height it needs at a given group width.
 */
export function groupLabelLayout(label: string, hasIcon: boolean, width?: number, bold = false) {
  const textWidth = Math.ceil(label.length * LABEL_CHAR_WIDTH * (bold ? 1.1 : 1))
  const minWidth = Math.min(textWidth + labelChrome(hasIcon) + 4, GROUP_LABEL_MAX_WIDTH)
  const available = Math.max(40, (width ?? minWidth) - labelChrome(hasIcon))
  const lines = Math.max(1, Math.ceil(textWidth / available))
  return { minWidth, headerHeight: (hasIcon ? 8 : 6) + lines * GROUP_LABEL_LINE_HEIGHT }
}

export const groupHasIcon = (node: AppNode) => node.type === 'awsGroup' && !!groupStyle(node.data?.groupType).icon

/** Node box size for layout, optionally as if an icon had a different size. */
export function layoutSize(node: AppNode, iconSize?: number): { width: number; height: number } {
  if (node.type === 'icon') {
    const size = iconSize ?? iconSizeOf(node)
    const label = labelHeight(node)
    return { width: iconNodeWidth(size), height: size + (label ? LABEL_GAP + label : 0) }
  }
  if (node.type === 'text') {
    const estimate = node.measured?.width && node.measured?.height ? undefined : estimateTextSize(node.data?.label ?? '', node.data?.fontSize, node.data?.bold)
    return { width: node.measured?.width ?? estimate!.width, height: node.measured?.height ?? estimate!.height }
  }
  if (node.type === 'image') {
    const size = imageSizeOf(node)
    const label = labelHeight(node)
    return {
      width: imageNodeWidth(size.width),
      height: size.height + (label ? LABEL_GAP + label : 0),
    }
  }
  const style = groupStyle(node.data?.groupType)
  return {
    width: node.width ?? node.measured?.width ?? style.width,
    height: node.height ?? node.measured?.height ?? style.height,
  }
}
