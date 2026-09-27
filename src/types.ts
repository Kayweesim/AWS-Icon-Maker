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

/** Free text placed with the text tool. */
export type TextNodeData = {
  label: string
  fontSize?: number
}

/** A user-supplied raster image embedded in the diagram as a data URL. */
export type ImageNodeData = {
  label: string
  src: string
}

export type IconNode = Node<IconNodeData, 'icon'>
export type GroupNode = Node<GroupNodeData, 'awsGroup'>
export type TextNode = Node<TextNodeData, 'text'>
export type ImageNode = Node<ImageNodeData, 'image'>
export type AppNode = IconNode | GroupNode | TextNode | ImageNode

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

/** One sheet of a diagram: its own canvas, shared with everyone in the room. */
export type DiagramPage = { id: string; name: string; nodes: AppNode[]; edges: AppEdge[] }

/** The part of a diagram shared with a collaboration room: no selection or other UI state. */
export type SharedDoc = { name: string; pages: DiagramPage[] }
