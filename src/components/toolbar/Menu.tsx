import { useEffect, useRef, useState, type ReactNode } from 'react'

type MenuProps = {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  /** Receives `close` so items can dismiss the menu after acting. */
  children: (close: () => void) => ReactNode
  width?: string
}

export function Menu({ trigger, children, width = 'w-52' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          className={`absolute top-full right-0 z-10 mt-1.5 ${width} rounded-lg border border-zinc-200 bg-white p-1 shadow-panel`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

type MenuItemProps = { icon: ReactNode; label: string; hint?: string; description?: string; onClick: () => void }

export function MenuItem({ icon, label, hint, description, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
    >
      <span className="mt-0.5 text-zinc-400">{icon}</span>
      <span className="flex flex-1 flex-col">
        <span>{label}</span>
        {description && <span className="text-[11.5px] leading-snug text-zinc-400">{description}</span>}
      </span>
      {hint && <span className="mt-0.5 text-[11px] text-zinc-400">{hint}</span>}
    </button>
  )
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-zinc-100" />
}
