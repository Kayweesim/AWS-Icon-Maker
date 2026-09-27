import { MousePointerClick } from 'lucide-react'
import { useDiagramStore } from '../../store/diagramStore'

export function EmptyState() {
  const empty = useDiagramStore((s) => s.nodes.length === 0)
  if (!empty) return null

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-400 shadow-panel">
          <MousePointerClick size={18} />
        </div>
        <p className="text-[14px] font-medium text-zinc-600">Start your architecture</p>
        <p className="max-w-64 text-[12.5px] leading-relaxed text-zinc-400">
          Press S to search for a service, drag one from the left panel, or drop an image file here. Press ? for shortcuts.
        </p>
      </div>
    </div>
  )
}
