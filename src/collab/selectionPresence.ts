import type { AppNode } from '../types'
import { useDiagramStore } from '../store/diagramStore'
import { presenceOf, type RoomPresence } from './client'

export type RemoteSelectionUser = {
  connectionId: number
  name: string
  colour: string
}

export type RemoteSelectionToken = string | number

type RemoteOther = {
  connectionId: number
  presence: RoomPresence
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index])

/** A stable projection of selection state, independent of node order. */
export function selectedNodeIds(nodes: readonly AppNode[]): string[] {
  return nodes
    .filter((node) => node.selected)
    .map((node) => node.id)
    .sort()
}

/**
 * Mirrors local node selection into ephemeral room presence. Node movement and data edits do not
 * publish again when the selected ids are unchanged.
 */
export function startSelectionPresence(): () => void {
  let lastIds: string[] | null = null

  const publish = (nodes: readonly AppNode[]) => {
    const nextIds = selectedNodeIds(nodes)
    if (lastIds && sameIds(lastIds, nextIds)) return
    lastIds = nextIds

    const state = useDiagramStore.getState()
    if (sameIds(state.presence.selectedNodeIds ?? [], nextIds)) return
    state.setPresence({ selectedNodeIds: nextIds })
  }

  publish(useDiagramStore.getState().nodes)
  return useDiagramStore.subscribe((state, previous) => {
    if (state.nodes !== previous.nodes) publish(state.nodes)
  })
}

/**
 * Converts remote selection presence to primitives so `useShallow` ignores cursor-only updates.
 * Each user is encoded as connection id, name, colour, id count, then selected node ids.
 */
export function remoteSelectionTokens(others: readonly RemoteOther[]): RemoteSelectionToken[] {
  const tokens: RemoteSelectionToken[] = []
  const sorted = [...others].sort((a, b) => a.connectionId - b.connectionId)

  for (const other of sorted) {
    const user = presenceOf(other.presence)
    const ids = Array.isArray(user.selectedNodeIds)
      ? [...new Set(user.selectedNodeIds.filter((id): id is string => typeof id === 'string'))]
      : []
    tokens.push(other.connectionId, user.name || 'Guest', user.colour || '#ED7100', ids.length, ...ids)
  }

  return tokens
}

/** Groups the compact remote-presence projection by selected node id. */
export function remoteSelectionsFromTokens(
  tokens: readonly RemoteSelectionToken[],
  validNodeIds?: ReadonlySet<string>,
): Map<string, RemoteSelectionUser[]> {
  const result = new Map<string, RemoteSelectionUser[]>()
  let index = 0

  while (index + 3 < tokens.length) {
    const connectionId = tokens[index++]
    const name = tokens[index++]
    const colour = tokens[index++]
    const idCount = tokens[index++]
    if (
      typeof connectionId !== 'number' ||
      typeof name !== 'string' ||
      typeof colour !== 'string' ||
      typeof idCount !== 'number' ||
      !Number.isInteger(idCount) ||
      idCount < 0 ||
      index + idCount > tokens.length
    ) {
      break
    }

    const user = { connectionId, name, colour }
    for (let idIndex = 0; idIndex < idCount; idIndex++) {
      const nodeId = tokens[index++]
      if (typeof nodeId !== 'string' || (validNodeIds && !validNodeIds.has(nodeId))) continue
      const users = result.get(nodeId)
      if (users) users.push(user)
      else result.set(nodeId, [user])
    }
  }

  return result
}
