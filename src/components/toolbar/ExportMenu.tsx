import { ChevronDown, FileCode2, FileJson, Image } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { DiagramActions } from '../../hooks/useDiagramActions'
import { mod } from '../../lib/platform'

function MenuItem({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
    >
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
    </button>
  )
}

export function ExportMenu({ actions }: { actions: DiagramActions }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 flex h-8 items-center gap-1 rounded-md bg-zinc-900 pr-2 pl-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Export
        <ChevronDown size={14} className="opacity-70" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-10 mt-1.5 w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-panel"
        >
          <MenuItem icon={<Image size={15} />} label="Export as PNG" onClick={choose(() => actions.exportAs('png'))} />
          <MenuItem icon={<FileCode2 size={15} />} label="Export as SVG" onClick={choose(() => actions.exportAs('svg'))} />
          <div className="my-1 h-px bg-zinc-100" />
          <MenuItem icon={<FileJson size={15} />} label="Save as JSON" hint={`${mod}S`} onClick={choose(actions.save)} />
        </div>
      )}
    </div>
  )
}
