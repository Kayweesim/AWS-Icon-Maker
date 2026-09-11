import { CornerDownLeft, Search, Type } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { groupStyle } from '../../data/groups'
import { quickSearch, type QuickItem } from '../../data/quickSearch'
import { useDiagramStore, type QuickAddTarget } from '../../store/diagramStore'
import { GRID_SIZE } from '../../types'

const PANEL_WIDTH = 320
/** Enough room for a full list, so the panel doesn't flip sides while typing. */
const PANEL_MAX_HEIGHT = 500
const MARGIN = 12

type Option = { type: 'item'; item: QuickItem } | { type: 'text'; text: string }

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

/** Search panel opened with S at the cursor; places the chosen item at that point. */
export function QuickAddPanel() {
  const target = useDiagramStore((s) => s.quickAdd)
  if (!target) return null
  // A fresh panel (empty search) each time it opens.
  return <QuickAddPopover key={`${target.screen.x}:${target.screen.y}`} target={target} />
}

function Thumbnail({ option }: { option: Option }) {
  if (option.type === 'text') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
        <Type size={15} />
      </span>
    )
  }
  const { item } = option
  if (item.kind === 'icon') return <img src={item.iconPath} alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
  const style = groupStyle(item.groupType)
  return (
    <span
      className="relative h-6 w-7 shrink-0 overflow-hidden rounded-[3px]"
      style={{ border: `1.5px ${style.dashed ? 'dashed' : 'solid'} ${style.stroke}`, background: style.fill ?? 'white' }}
    >
      {item.iconPath && <img src={item.iconPath} alt="" className="absolute -top-px -left-px h-3 w-3" />}
    </span>
  )
}

function QuickAddPopover({ target }: { target: QuickAddTarget }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const close = useDiagramStore((s) => s.closeQuickAdd)
  const addIconNode = useDiagramStore((s) => s.addIconNode)
  const addGroupNode = useDiagramStore((s) => s.addGroupNode)
  const addTextNode = useDiagramStore((s) => s.addTextNode)

  const results = useMemo(() => quickSearch(query), [query])
  const text = query.trim()
  const options: Option[] = [
    ...results.map((item): Option => ({ type: 'item', item })),
    ...(text ? [{ type: 'text', text } as Option] : []),
  ]
  const current = Math.min(active, options.length - 1)

  // Clicking anywhere outside the panel closes it.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [close])

  const place = (option: Option | undefined) => {
    if (!option) return
    const { flow } = target
    if (option.type === 'text') addTextNode(flow, option.text)
    else if (option.item.kind === 'icon') {
      const { icon } = option.item
      addIconNode({ iconId: icon.id, name: icon.name, path: icon.path }, flow)
    } else {
      addGroupNode(option.item.groupType, { x: snap(flow.x - 16), y: snap(flow.y - 16) })
    }
    close()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(Math.min(current + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      place(options[current])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  // Open below-right of the cursor, flipping to stay on screen.
  const left = Math.max(MARGIN, Math.min(target.screen.x + 8, window.innerWidth - PANEL_WIDTH - MARGIN))
  const below = target.screen.y + 8 + PANEL_MAX_HEIGHT <= window.innerHeight - MARGIN
  const verticalPosition = below
    ? { top: target.screen.y + 8 }
    : { bottom: Math.max(MARGIN, window.innerHeight - target.screen.y + 8) }

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow"
        style={{ left: target.screen.x, top: target.screen.y }}
      />
      <div
        ref={ref}
        role="dialog"
        aria-label="Quick add"
        className="fixed z-30 overflow-hidden rounded-2xl border-2 border-blue-400 bg-white shadow-[0_0_0_4px_rgb(59_130_246/0.14),0_16px_40px_rgb(15_23_42/0.16)]"
        style={{ left, width: PANEL_WIDTH, ...verticalPosition }}
      >
        <div className="flex items-center gap-2 border-b border-blue-100 px-3.5">
          <Search size={15} className="shrink-0 text-blue-500" />
          <input
            autoFocus
            data-quick-add
            role="combobox"
            aria-expanded="true"
            aria-controls="quick-add-results"
            aria-activedescendant={options.length ? `quick-add-option-${current}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search services and groups"
            className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>

        {!text && <div className="px-4 pt-2.5 pb-0.5 text-[10.5px] font-medium tracking-wide text-zinc-400 uppercase">Suggested</div>}
        <ul id="quick-add-results" role="listbox" aria-label="Results" className="p-2">
          {options.map((option, i) => (
            <li
              key={option.type === 'item' ? option.item.key : 'text'}
              id={`quick-add-option-${i}`}
              role="option"
              aria-selected={i === current}
              onMouseMove={() => i !== current && setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => place(option)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5 ${i === current ? 'bg-blue-50' : ''}`}
            >
              <Thumbnail option={option} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] text-zinc-900">
                  {option.type === 'text' ? <>Add text “{option.text}”</> : option.item.name}
                </div>
                {option.type === 'item' && <div className="mt-0.5 text-[11px] text-zinc-400">{option.item.detail}</div>}
              </div>
              {i === current && <CornerDownLeft size={14} className="shrink-0 text-blue-500" />}
            </li>
          ))}
        </ul>

        <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50/60 px-4 py-1.5 text-[11px] text-zinc-400">
          <span>↑↓ choose</span>
          <span>↵ add here</span>
          <span>Esc close</span>
        </div>
      </div>
    </>
  )
}
