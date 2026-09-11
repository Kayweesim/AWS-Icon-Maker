import { memo, type DragEvent } from 'react'
import type { IconEntry } from '../../data/icons'
import { DRAG_MIME, type PaletteDragItem } from '../../types'

function PaletteItemComponent({ icon }: { icon: IconEntry }) {
  const onDragStart = (event: DragEvent) => {
    const item: PaletteDragItem = { kind: 'icon', iconId: icon.id, name: icon.name, path: icon.path }
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const title = icon.service ? `${icon.name} — ${icon.service}` : icon.name

  return (
    <div
      draggable
      onDragStart={onDragStart}
      title={title}
      className="group flex cursor-grab flex-col items-center gap-1 rounded-md px-1 py-2 hover:bg-zinc-100 active:cursor-grabbing"
    >
      <img src={icon.path} alt="" width={36} height={36} loading="lazy" draggable={false} className="h-9 w-9" />
      <span className="line-clamp-2 w-full text-center text-[10.5px] leading-tight text-zinc-600 group-hover:text-zinc-900">
        {icon.name}
      </span>
    </div>
  )
}

export const PaletteItem = memo(PaletteItemComponent)
