import type { AppEdge, AppNode } from '../types'

export type Snapshot = { nodes: AppNode[]; edges: AppEdge[] }

export const HISTORY_LIMIT = 100

/** Identity of a diagram for undo purposes, ignoring transient UI state like selection. */
export function snapshotKey({ nodes, edges }: Snapshot): string {
  return JSON.stringify([
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nodes.map(({ selected, dragging, resizing, measured, ...rest }) => rest),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    edges.map(({ selected, ...rest }) => rest),
  ])
}
