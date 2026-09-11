import { Copy, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDiagramStore } from '../../store/diagramStore'
import type { IconNode } from '../../types'
import { EdgeProperties } from './EdgeProperties'
import { GroupProperties, IconProperties, IconSizeField, TextProperties } from './NodeProperties'

function PanelAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-200 text-[12px] transition-colors ${
        danger ? 'text-red-600 hover:border-red-200 hover:bg-red-50' : 'text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {children}
      {label}
    </button>
  )
}

export function PropertiesPanel() {
  const nodes = useDiagramStore(useShallow((s) => s.nodes.filter((n) => n.selected)))
  const edges = useDiagramStore(useShallow((s) => s.edges.filter((e) => e.selected)))
  const duplicate = useDiagramStore((s) => s.duplicate)
  const deleteSelection = useDiagramStore((s) => s.deleteSelection)

  const count = nodes.length + edges.length
  if (count === 0) return null

  const single = count === 1 ? (nodes[0] ?? edges[0]) : undefined
  const icons = nodes.filter((n): n is IconNode => n.type === 'icon')
  let title: string
  let body: ReactNode = null

  if (single && 'source' in single) {
    title = 'Connection'
    body = <EdgeProperties edges={edges} />
  } else if (single?.type === 'icon') {
    title = 'Service'
    body = <IconProperties node={single} />
  } else if (single?.type === 'awsGroup') {
    title = 'Group'
    body = <GroupProperties node={single} />
  } else if (single?.type === 'text') {
    title = 'Text'
    body = <TextProperties node={single} />
  } else {
    title = `${count} selected`
    if (icons.length > 0 || edges.length > 0) {
      body = (
        <>
          {icons.length > 0 && <IconSizeField nodes={icons} />}
          {edges.length > 0 && <EdgeProperties edges={edges} />}
        </>
      )
    }
  }

  return (
    <aside
      aria-label="Properties"
      className="absolute top-16 right-3 z-10 flex max-h-[calc(100%-10rem)] w-64 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-panel"
    >
      <header className="border-b border-zinc-100 px-3.5 py-2.5 text-[12.5px] font-semibold text-zinc-800">{title}</header>
      {body && <div className="flex flex-col gap-4 overflow-y-auto px-3.5 py-3.5">{body}</div>}
      <footer className="flex gap-2 border-t border-zinc-100 p-2.5">
        {nodes.length > 0 && (
          <PanelAction label="Duplicate" onClick={duplicate}>
            <Copy size={13} />
          </PanelAction>
        )}
        <PanelAction label="Delete" onClick={deleteSelection} danger>
          <Trash2 size={13} />
        </PanelAction>
      </footer>
    </aside>
  )
}
