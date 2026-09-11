import type { Edge, Node } from '@xyflow/react'
import type { GroupType } from './data/groups'

export type IconNodeData = {
  label: string
  iconPath: string
  iconId: string
  /** Rendered icon size in px. Missing on icons saved before sizes existed (drawn at 48px). */
  iconSize?: number
}

export type GroupNodeData = {
  label: string
  groupType: GroupType
}

export type IconNode = Node<IconNodeData, 'icon'>
export type GroupNode = Node<GroupNodeData, 'awsGroup'>
export type AppNode = IconNode | GroupNode

export type EdgePathType = 'step' | 'straight' | 'bezier'
export type EdgeArrows = 'end' | 'both' | 'none'

export type AwsEdgeData = {
  label: string
  dashed: boolean
  pathType: EdgePathType
  arrows: EdgeArrows
}

export type AppEdge = Edge<AwsEdgeData, 'aws'>

/** Payload carried by drag events from the palette to the canvas. */
export type PaletteDragItem =
  | { kind: 'icon'; iconId: string; name: string; path: string }
  | { kind: 'group'; groupType: GroupType }

export const DRAG_MIME = 'application/x-aws-diagram-item'
export { GRID_SIZE } from './layout/config'
