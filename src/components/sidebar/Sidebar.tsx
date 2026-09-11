import { Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { filterArrowPresets } from '../../data/arrows'
import { filterCategories } from '../../data/icons'
import { ArrowPalette } from './ArrowPalette'
import { CategorySection } from './CategorySection'
import { GroupPalette } from './GroupPalette'

export function Sidebar() {
  const [query, setQuery] = useState('')
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set(['Arrows', 'Groups', 'Compute']))
  const deferredQuery = useDeferredValue(query)
  const categories = useMemo(() => filterCategories(deferredQuery), [deferredQuery])
  const arrows = useMemo(() => filterArrowPresets(deferredQuery), [deferredQuery])
  const searching = deferredQuery.trim().length > 0

  const toggle = (name: string) =>
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 p-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-400" />
          <input
            id="icon-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Search services and arrows"
            className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 pr-7 pl-8 text-[13px] outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {arrows.length > 0 && (
          <ArrowPalette presets={arrows} open={searching || openCategories.has('Arrows')} onToggle={() => toggle('Arrows')} />
        )}
        {!searching && <GroupPalette open={openCategories.has('Groups')} onToggle={() => toggle('Groups')} />}
        {categories.map((category) => (
          <CategorySection
            key={category.name}
            category={category}
            open={searching || openCategories.has(category.name)}
            onToggle={() => toggle(category.name)}
          />
        ))}
        {categories.length === 0 && arrows.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-zinc-400">Nothing matches “{deferredQuery}”</p>
        )}
      </div>
    </aside>
  )
}
