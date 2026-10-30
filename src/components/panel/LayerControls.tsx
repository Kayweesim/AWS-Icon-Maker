import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { layerAvailability } from '../../lib/layers'
import { useDiagramStore } from '../../store/diagramStore'

const actions = [
  { action: 'front', label: 'Bring to front', Icon: ArrowUpToLine, direction: 'forward' },
  { action: 'back', label: 'Send to back', Icon: ArrowDownToLine, direction: 'backward' },
  { action: 'forward', label: 'Bring forward', Icon: ArrowUp, direction: 'forward' },
  { action: 'backward', label: 'Send backward', Icon: ArrowDown, direction: 'backward' },
] as const

export function LayerControls() {
  const move = useDiagramStore((state) => state.moveSelectionLayer)
  const available = useDiagramStore(useShallow(layerAvailability))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[11px] font-medium text-zinc-500">Layer</legend>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map(({ action, label, Icon, direction }) => (
          <button
            key={action}
            type="button"
            onClick={() => move(action)}
            disabled={!available[direction]}
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-200 text-[11px] text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
