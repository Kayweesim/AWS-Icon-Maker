import { ChevronRight } from 'lucide-react'
import type { IconCategory, IconEntry } from '../../data/icons'
import { PaletteItem } from './PaletteItem'

type Props = {
  category: IconCategory
  open: boolean
  onToggle: () => void
}

function IconGrid({ icons }: { icons: IconEntry[] }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {icons.map((icon) => (
        <PaletteItem key={icon.id} icon={icon} />
      ))}
    </div>
  )
}

export function CategorySection({ category, open, onToggle }: Props) {
  const count = category.services.length + category.resources.length

  return (
    <section className="border-b border-zinc-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <ChevronRight size={14} className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1 truncate">{category.name}</span>
        <span className="text-[11px] font-normal text-zinc-400 tabular-nums">{count}</span>
      </button>
      {open && (
        <div className="px-2 pb-3">
          {category.services.length > 0 && <IconGrid icons={category.services} />}
          {category.resources.length > 0 && (
            <>
              <div className="px-1 pt-2 pb-1 text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                Resources
              </div>
              <IconGrid icons={category.resources} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
