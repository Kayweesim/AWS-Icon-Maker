import { ChevronDown, FileCode2, FileJson, Image, Workflow } from 'lucide-react'
import type { DiagramActions } from '../../hooks/useDiagramActions'
import { mod } from '../../lib/platform'
import { Menu, MenuDivider, MenuItem } from './Menu'

export function ExportMenu({ actions }: { actions: DiagramActions }) {
  return (
    <Menu
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className="ml-1 flex h-8 items-center gap-1 rounded-md bg-zinc-900 pr-2 pl-3 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Export
          <ChevronDown size={14} className="opacity-70" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem icon={<Image size={15} />} label="Export as PNG" onClick={() => (close(), actions.exportAs('png'))} />
          <MenuItem icon={<FileCode2 size={15} />} label="Export as SVG" onClick={() => (close(), actions.exportAs('svg'))} />
          <MenuItem icon={<Workflow size={15} />} label="Export as draw.io" onClick={() => (close(), actions.exportDrawio())} />
          <MenuDivider />
          <MenuItem icon={<FileJson size={15} />} label="Save as JSON" hint={`${mod}S`} onClick={() => (close(), actions.save())} />
        </>
      )}
    </Menu>
  )
}
