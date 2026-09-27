import { ViewportPortal, useStore } from '@xyflow/react'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  remoteSelectionsFromTokens,
  remoteSelectionTokens,
  type RemoteSelectionUser,
} from '../../collab/selectionPresence'
import { presenceOf } from '../../collab/client'
import { presenceInitials } from '../../collab/room'
import { absoluteRect } from '../../lib/geometry'
import { useDiagramStore } from '../../store/diagramStore'
import type { AppNode } from '../../types'

const MAX_BADGES = 3
const FALLBACK_COLOUR = '#ED7100'

const displayName = (user: RemoteSelectionUser) => user.name.trim() || 'Guest'

/**
 * Alternating colour and white shadows make each collaborator visible without drawing over the
 * node's own selection treatment. Spread distances are canvas units, so divide by zoom to keep
 * every ring two screen pixels wide.
 */
function selectionRings(users: RemoteSelectionUser[], zoom: number): string {
  const visible = users.slice(0, MAX_BADGES)
  return visible
    .flatMap((user, index) => {
      const colour = user.colour || FALLBACK_COLOUR
      const colourSpread = (index * 4 + 2) / zoom
      if (index === visible.length - 1) return [`0 0 0 ${colourSpread}px ${colour}`]
      const separatorSpread = (index * 4 + 4) / zoom
      return [`0 0 0 ${colourSpread}px ${colour}`, `0 0 0 ${separatorSpread}px white`]
    })
    .join(', ')
}

function UserBadges({ users }: { users: RemoteSelectionUser[] }) {
  const visible = users.slice(0, MAX_BADGES)
  const overflow = users.length - visible.length
  const names = users.map(displayName)
  const label = `Selected by ${names.join(', ')}`

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className="flex -space-x-1.5 whitespace-nowrap"
      style={{ transform: 'translateY(calc(-100% - 6px))' }}
    >
      {visible.map((user) => {
        const name = displayName(user)
        return (
          <span
            key={user.connectionId}
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: user.colour || FALLBACK_COLOUR }}
          >
            {presenceInitials(name)}
          </span>
        )
      })}
      {overflow > 0 && (
        <span
          aria-hidden="true"
          className="flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-zinc-600 px-0.5 text-[8px] font-semibold text-white shadow-sm"
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

/** Highlights nodes selected by other people in the room without changing the diagram itself. */
export function RemoteSelections({ nodes }: { nodes: AppNode[] }) {
  // Tokens contain only stable selection metadata, so remote cursor movement does not re-render
  // this layer. There is intentionally one subscription for the entire indicator layer.
  const tokens = useDiagramStore(
    useShallow((state) =>
      // Only people on this page: a selection on another sheet says nothing about these nodes.
      remoteSelectionTokens(state.liveblocks.others.filter((other) => presenceOf(other.presence).pageId === state.activePageId)),
    ),
  )
  const zoom = useStore((state) => state.transform[2])

  const indicators = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const selections = remoteSelectionsFromTokens(tokens, new Set(byId.keys()))

    return Array.from(selections, ([nodeId, selectedBy]) => {
      const node = byId.get(nodeId)
      if (!node) return null
      return {
        nodeId,
        rect: absoluteRect(node, byId),
        // Keep badge/ring ordering stable even if presence delivery order changes.
        users: [...selectedBy].sort((a, b) => a.connectionId - b.connectionId),
      }
    }).filter((indicator): indicator is NonNullable<typeof indicator> => indicator !== null)
  }, [nodes, tokens])

  if (indicators.length === 0) return null

  return (
    <ViewportPortal>
      {indicators.map(({ nodeId, rect, users }) => (
        <div key={nodeId} className="pointer-events-none absolute top-0 left-0" style={{ zIndex: 1002 }}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0"
            style={{
              width: rect.width,
              height: rect.height,
              borderRadius: 3 / zoom,
              boxShadow: selectionRings(users, zoom),
              transform: `translate(${rect.x}px, ${rect.y}px)`,
            }}
          />
          <div
            className="pointer-events-none absolute top-0 left-0"
            style={{
              transform: `translate(${rect.x}px, ${rect.y}px) scale(${1 / zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <UserBadges users={users} />
          </div>
        </div>
      ))}
    </ViewportPortal>
  )
}
