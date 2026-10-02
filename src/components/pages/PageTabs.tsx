import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { presenceOf } from '../../collab/client'
import { presenceColour } from '../../collab/room'
import { useDiagramStore } from '../../store/diagramStore'

/** Everyone else in the room, grouped by the page they are on. */
function useOthersByPage(): Record<string, string[]> {
  const others = useDiagramStore((s) => s.liveblocks.others)
  const byPage: Record<string, string[]> = {}
  for (const other of others) {
    const { pageId, name } = presenceOf(other.presence)
    if (!pageId) continue
    ;(byPage[pageId] ??= []).push(name || 'Guest')
  }
  return byPage
}

function Tab({ id, name, active, closable }: { id: string; name: string; active: boolean; closable: boolean }) {
  const selectPage = useDiagramStore((s) => s.selectPage)
  const renamePage = useDiagramStore((s) => s.renamePage)
  const deletePage = useDiagramStore((s) => s.deletePage)
  const visitors = useOthersByPage()[id] ?? []
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const editing = draft !== null

  // Select the name once when editing starts, not on every keystroke, or each letter replaces the last.
  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  const commit = () => {
    if (draft !== null) renamePage(id, draft)
    setDraft(null)
  }

  return (
    <div
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onClick={() => selectPage(id)}
      onKeyDown={(event) => event.key === 'Enter' && selectPage(id)}
      onDoubleClick={() => setDraft(name)}
      title={visitors.length ? `${name} — ${visitors.join(', ')} here` : `${name} (double-click to rename)`}
      className={`group flex h-7 cursor-pointer items-center gap-1.5 rounded-md pr-1.5 pl-2.5 text-[12.5px] whitespace-nowrap transition-colors ${
        active ? 'bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800'
      }`}
    >
      {draft === null ? (
        <span className="max-w-40 truncate">{name}</span>
      ) : (
        <input
          ref={input}
          aria-label="Page name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setDraft(null)
            event.stopPropagation()
          }}
          className="w-24 min-w-0 rounded bg-white px-1 text-[12.5px] text-zinc-900 outline-none ring-2 ring-blue-200"
        />
      )}

      {visitors.length > 0 && (
        <span className="flex -space-x-1">
          {visitors.slice(0, 3).map((visitor, index) => (
            <span
              key={`${visitor}-${index}`}
              title={visitor}
              className="h-2 w-2 rounded-full border border-white"
              style={{ backgroundColor: presenceColour(visitor) }}
            />
          ))}
        </span>
      )}

      {closable && draft === null && (
        <button
          type="button"
          aria-label={`Delete ${name}`}
          onClick={(event) => {
            event.stopPropagation()
            deletePage(id)
          }}
          className="rounded p-0.5 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 hover:text-zinc-700 focus:opacity-100"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

/** The sheet tabs along the bottom of the canvas. */
export function PageTabs() {
  const pages = useDiagramStore((s) => s.pages)
  const activePageId = useDiagramStore((s) => s.activePageId)
  const addPage = useDiagramStore((s) => s.addPage)

  return (
    <div role="tablist" aria-label="Pages" className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-t border-zinc-200 bg-zinc-50 px-2">
      {pages.map((page) => (
        <Tab key={page.id} id={page.id} name={page.name} active={page.id === activePageId} closable={pages.length > 1} />
      ))}
      <button
        type="button"
        aria-label="Add page"
        onClick={addPage}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white hover:text-zinc-900"
      >
        <Plus size={15} />
      </button>
      <span className="ml-1 hidden text-[11px] text-zinc-400 sm:inline">
        {pages.length} {pages.length === 1 ? 'page' : 'pages'} · copy and paste moves things between them
      </span>
    </div>
  )
}
