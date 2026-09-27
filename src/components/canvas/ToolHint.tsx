import { Frame, MoveRight, Type } from 'lucide-react'
import type { ReactNode } from 'react'
import { arrowPreset } from '../../data/arrows'
import { groupOnlySelection, useDiagramStore } from '../../store/diagramStore'

function Pill({ icon, onCancel, children }: { icon: ReactNode; onCancel: () => void; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-zinc-900 py-1.5 pr-1.5 pl-3.5 text-[12.5px] text-white shadow-panel"
      >
        <span className="text-zinc-400">{icon}</span>
        {children}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11.5px] text-zinc-200 hover:bg-white/20"
        >
          Esc
        </button>
      </div>
    </div>
  )
}

/** Explains the active tool, or a group-only selection, and how to leave it. */
export function ToolHint() {
  const tool = useDiagramStore((s) => s.tool)
  const cancelTool = useDiagramStore((s) => s.cancelTool)
  const clearSelection = useDiagramStore((s) => s.clearSelection)
  const sourceLabel = useDiagramStore((s) => {
    if (s.tool.kind !== 'arrow' || !s.tool.sourceId) return null
    const source = s.nodes.find((n) => n.id === (s.tool as { sourceId: string }).sourceId)
    return source ? source.data.label || 'the selected node' : null
  })
  const groupOnlyLabel = useDiagramStore((s) => {
    const id = groupOnlySelection(s)
    return id ? s.nodes.find((n) => n.id === id)?.data.label || 'this group' : null
  })

  if (tool.kind === 'select') {
    if (!groupOnlyLabel) return null
    return (
      <Pill icon={<Frame size={14} />} onCancel={clearSelection}>
        <span>
          Just <strong className="font-medium">{groupOnlyLabel}</strong> is selected
          <span className="text-zinc-400"> · Delete removes it and keeps what’s inside</span>
        </span>
      </Pill>
    )
  }

  if (tool.kind === 'text') {
    return (
      <Pill icon={<Type size={14} />} onCancel={cancelTool}>
        <span>Click anywhere to add text</span>
      </Pill>
    )
  }

  return (
    <Pill icon={<MoveRight size={14} />} onCancel={cancelTool}>
      <span className="text-zinc-400">{arrowPreset(tool.preset).label}:</span>
      <span>
        {sourceLabel ? (
          <>
            Click a node to connect from <strong className="font-medium">{sourceLabel}</strong>
            <span className="text-zinc-400"> · Shift-click to keep chaining</span>
          </>
        ) : (
          'Click the node the arrow starts from'
        )}
      </span>
    </Pill>
  )
}
