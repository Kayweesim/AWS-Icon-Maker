import { ChevronRight } from 'lucide-react'
import type { DragEvent } from 'react'
import { GROUP_TYPES, groupIconPath, groupStyle, type GroupType } from '../../data/groups'
import { DRAG_MIME, type PaletteDragItem } from '../../types'

function GroupItem({ type }: { type: GroupType }) {
  const style = groupStyle(type)
  const iconPath = groupIconPath(type)

  const onDragStart = (event: DragEvent) => {
    const item: PaletteDragItem = { kind: 'group', groupType: type }
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={style.label}
      className="flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-zinc-100 active:cursor-grabbing"
    >
      <div
        className="relative h-5 w-7 shrink-0 overflow-hidden rounded-[2px]"
        style={{
          border: `1.5px ${style.dashed ? 'dashed' : 'solid'} ${style.stroke}`,
          background: style.fill ?? 'white',
        }}
      >
        {iconPath && <img src={iconPath} alt="" draggable={false} className="absolute -top-px -left-px h-2.5 w-2.5" />}
      </div>
      <span className="truncate text-[11.5px] text-zinc-700">{style.label}</span>
    </div>
  )
}

export function GroupPalette({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <section className="border-b border-zinc-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <ChevronRight size={14} className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1">Groups</span>
        <span className="text-[11px] font-normal text-zinc-400 tabular-nums">{GROUP_TYPES.length}</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-x-1 px-2 pb-3">
          {GROUP_TYPES.map((type) => (
            <GroupItem key={type} type={type} />
          ))}
        </div>
      )}
    </section>
  )
}
