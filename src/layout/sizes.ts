import { groupStyle } from '../data/groups'
import type { AppNode, IconNode } from '../types'
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

export function estimateLabelHeight(label: string): number {
  if (!label) return 0
  const lines = label
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil((line.length * LABEL_CHAR_WIDTH) / LABEL_WIDTH)), 0)
  return lines * LABEL_LINE_HEIGHT
}

function labelHeight(node: IconNode): number {
  const label = node.data?.label ?? ''
  if (!label) return 0
  // The rendered label keeps its height when the icon is resized, since its width is fixed.
  const measured = node.measured?.height
  if (measured) return Math.max(LABEL_LINE_HEIGHT, measured - iconSizeOf(node) - LABEL_GAP)
  return estimateLabelHeight(label)
}

/** Approximate size of a text box before it has been rendered. */
export function estimateTextSize(label: string, fontSize = TEXT_FONT_SIZE) {
  const charWidth = fontSize * 0.55
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
export function groupLabelLayout(label: string, hasIcon: boolean, width?: number) {
  const textWidth = Math.ceil(label.length * LABEL_CHAR_WIDTH)
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
    const estimate = node.measured?.width && node.measured?.height ? undefined : estimateTextSize(node.data?.label ?? '', node.data?.fontSize)
    return { width: node.measured?.width ?? estimate!.width, height: node.measured?.height ?? estimate!.height }
  }
  const style = groupStyle(node.data?.groupType)
  return {
    width: node.width ?? node.measured?.width ?? style.width,
    height: node.height ?? node.measured?.height ?? style.height,
  }
}
