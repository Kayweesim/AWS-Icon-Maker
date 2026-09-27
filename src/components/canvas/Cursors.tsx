import { ViewportPortal } from '@xyflow/react'
import { useDiagramStore } from '../../store/diagramStore'

/** The other people in the room, drawn in canvas coordinates so they track pan and zoom. */
export function Cursors() {
  const others = useDiagramStore((s) => s.liveblocks.others)
  const visible = others.filter((other) => other.presence.cursor)
  if (visible.length === 0) return null

  return (
    <ViewportPortal>
      {visible.map((other) => {
        const { cursor, name, colour } = other.presence
        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute top-0 left-0 z-50 origin-top-left"
            style={{ transform: `translate(${cursor!.x}px, ${cursor!.y}px)` }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill={colour || '#ED7100'} aria-hidden>
              <path d="M0 0 L0 16 L4.2 12.2 L6.8 18.4 L9.6 17.2 L7 11 L12.6 11 Z" stroke="white" strokeWidth="1.2" />
            </svg>
            <span
              className="ml-3 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-white"
              style={{ backgroundColor: colour || '#ED7100' }}
            >
              {name || 'Guest'}
            </span>
          </div>
        )
      })}
    </ViewportPortal>
  )
}
