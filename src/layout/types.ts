import type { XYPosition } from '@xyflow/react'

/** New layout values computed by Tidy or Auto-arrange. Positions are relative to each node's parent. */
export type LayoutResult = {
  positions: Record<string, XYPosition>
  groupSizes: Record<string, { width: number; height: number }>
  iconSizes: Record<string, number>
  edgeHandles: Record<string, { sourceHandle: string; targetHandle: string }>
}

export type LayoutOptions = {
  /** When non-empty, only these nodes (and their contents) are laid out. */
  selectedIds?: string[]
}

export const emptyLayout = (): LayoutResult => ({ positions: {}, groupSizes: {}, iconSizes: {}, edgeHandles: {} })

export const isEmptyLayout = (result: LayoutResult) =>
  [result.positions, result.groupSizes, result.iconSizes, result.edgeHandles].every((r) => Object.keys(r).length === 0)
