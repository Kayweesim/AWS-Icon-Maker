import { FilePlus2, FolderOpen, Keyboard, Redo2, Save, Undo2 } from 'lucide-react'
import type { DiagramActions } from '../../hooks/useDiagramActions'
import { mod, shift } from '../../lib/platform'
import { useDiagramStore } from '../../store/diagramStore'
import { ExportMenu } from './ExportMenu'
import { ToolbarButton, ToolbarDivider } from './ToolbarButton'

const panel = 'pointer-events-auto flex h-11 items-center rounded-xl border border-zinc-200 bg-white/95 px-1.5 shadow-panel backdrop-blur'

type Props = { actions: DiagramActions; onShowShortcuts: () => void }

export function Toolbar({ actions, onShowShortcuts }: Props) {
  const name = useDiagramStore((s) => s.name)
  const setName = useDiagramStore((s) => s.setName)
  const canUndo = useDiagramStore((s) => s.past.length > 0)
  const canRedo = useDiagramStore((s) => s.future.length > 0)
  const undo = useDiagramStore((s) => s.undo)
  const redo = useDiagramStore((s) => s.redo)

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
      <div className={`${panel} gap-2 pr-3 pl-2.5`}>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#232F3E] text-[9px] font-bold tracking-tight text-white">
          AWS
        </div>
        <input
          aria-label="Diagram name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => !e.target.value.trim() && setName('Untitled diagram')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && e.currentTarget.blur()}
          size={Math.max(name.length, 8)}
          className="max-w-72 rounded px-1 py-0.5 text-[13px] font-medium text-zinc-800 outline-none hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className={panel}>
        <ToolbarButton label="Undo" shortcut={`${mod}Z`} onClick={undo} disabled={!canUndo}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" shortcut={`${shift}${mod}Z`} onClick={redo} disabled={!canRedo}>
          <Redo2 size={16} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="New diagram" onClick={actions.newDiagram}>
          <FilePlus2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Open" shortcut={`${mod}O`} onClick={actions.open}>
          <FolderOpen size={16} />
        </ToolbarButton>
        <ToolbarButton label="Save" shortcut={`${mod}S`} onClick={actions.save}>
          <Save size={16} />
        </ToolbarButton>
        <ToolbarButton label="Keyboard shortcuts" shortcut="?" onClick={onShowShortcuts}>
          <Keyboard size={16} />
        </ToolbarButton>
        <ExportMenu actions={actions} />
      </div>
    </div>
  )
}
