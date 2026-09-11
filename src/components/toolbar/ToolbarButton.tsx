import type { ReactNode } from 'react'

type Props = {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

export function ToolbarButton({ label, shortcut, onClick, disabled, children }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}

export function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-zinc-200" />
}
