import { groupStyle } from '../data/groups'
import type { AppNode, IconNode } from '../types'
import { LABEL_CHAR_WIDTH, LABEL_GAP, LABEL_LINE_HEIGHT, LABEL_WIDTH, LEGACY_ICON_SIZE } from './config'

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

/** Node box size for layout, optionally as if the icon had a different size. */
export function layoutSize(node: AppNode, iconSize?: number): { width: number; height: number } {
  if (node.type === 'icon') {
    const size = iconSize ?? iconSizeOf(node)
    const label = labelHeight(node)
    return { width: iconNodeWidth(size), height: size + (label ? LABEL_GAP + label : 0) }
  }
  const style = groupStyle(node.data?.groupType)
  return {
    width: node.width ?? node.measured?.width ?? style.width,
    height: node.height ?? node.measured?.height ?? style.height,
  }
}
