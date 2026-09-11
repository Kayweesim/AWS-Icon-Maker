import { MoveRight, Type } from 'lucide-react'
import { arrowPreset } from '../../data/arrows'
import { useDiagramStore } from '../../store/diagramStore'

/** Explains the active tool and how to leave it. */
export function ToolHint() {
  const tool = useDiagramStore((s) => s.tool)
  const cancelTool = useDiagramStore((s) => s.cancelTool)
  const sourceLabel = useDiagramStore((s) => {
    if (s.tool.kind !== 'arrow' || !s.tool.sourceId) return null
    const source = s.nodes.find((n) => n.id === (s.tool as { sourceId: string }).sourceId)
    return source ? source.data.label || 'the selected node' : null
  })

  if (tool.kind === 'select') return null

  const message =
    tool.kind === 'text' ? (
      'Click anywhere to add text'
    ) : sourceLabel ? (
      <>
        Click a service to connect from <strong className="font-medium">{sourceLabel}</strong>
        <span className="text-zinc-400"> · Shift-click to keep chaining</span>
      </>
    ) : (
      'Click the service the arrow starts from'
    )

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-zinc-900 py-1.5 pr-1.5 pl-3.5 text-[12.5px] text-white shadow-panel"
      >
        {tool.kind === 'text' ? <Type size={14} className="text-zinc-400" /> : <MoveRight size={14} className="text-zinc-400" />}
        {tool.kind === 'arrow' && <span className="text-zinc-400">{arrowPreset(tool.preset).label}:</span>}
        <span>{message}</span>
        <button
          type="button"
          onClick={cancelTool}
          className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11.5px] text-zinc-200 hover:bg-white/20"
        >
          Esc
        </button>
      </div>
    </div>
  )
}
