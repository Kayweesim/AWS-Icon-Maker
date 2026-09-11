import { AlignStartVertical, Network, Sparkles } from 'lucide-react'
import type { DiagramActions } from '../../hooks/useDiagramActions'
import { shift } from '../../lib/platform'
import { Menu, MenuItem } from './Menu'

export function CleanUpMenu({ actions }: { actions: DiagramActions }) {
  return (
    <Menu
      width="w-64"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-label="Clean up"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Clean up (applies to the selection, or everything)"
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Sparkles size={16} />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem
            icon={<AlignStartVertical size={15} />}
            label="Tidy"
            hint={`${shift}T`}
            description="Keep the layout; standard sizes, snap, align, fit groups"
            onClick={() => (close(), actions.tidy())}
          />
          <MenuItem
            icon={<Network size={15} />}
            label="Auto-arrange"
            hint={`${shift}A`}
            description="Rebuild the layout left to right along the arrows"
            onClick={() => (close(), actions.autoArrange())}
          />
        </>
      )}
    </Menu>
  )
}
