import { History } from 'lucide-react'
import { useMemo } from 'react'
import type { DiagramActions } from '../../hooks/useDiagramActions'
import { listVersions, MAX_VERSIONS, type Version, type VersionReason } from '../../lib/versions'
import { Menu } from './Menu'

const REASON_LABEL: Record<VersionReason, string> = {
  auto: 'Autosaved',
  'delete-page': 'Before deleting a page',
  'new-diagram': 'Before starting a new diagram',
  restore: 'Before restoring a version',
  open: 'Before opening a file',
}

function when(ms: number): string {
  const date = new Date(ms)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

function summary({ diagram }: Version): string {
  const pages = diagram.pages.length
  const items = diagram.pages.reduce((sum, page) => sum + page.nodes.length, 0)
  return `${diagram.name} · ${pages} ${pages === 1 ? 'page' : 'pages'}, ${items} ${items === 1 ? 'item' : 'items'}`
}

function VersionList({ actions, close }: { actions: DiagramActions; close: () => void }) {
  // Read once per opening: versions only change through actions that close the menu.
  const versions = useMemo(() => listVersions(), [])

  return (
    <>
      <div className="px-2.5 pt-1.5 pb-1 text-[11.5px] leading-snug text-zinc-400">
        The last {MAX_VERSIONS} versions are kept in this browser. Restoring can itself be undone.
      </div>
      {versions.length === 0 ? (
        <div className="px-2.5 py-2 text-[13px] text-zinc-500">No versions yet — one is kept every few minutes while you edit.</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {versions.map((version) => (
            <button
              key={version.id}
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                actions.restoreVersion(version)
              }}
              className="flex w-full flex-col rounded-md px-2.5 py-1.5 text-left hover:bg-zinc-100"
            >
              <span className="flex items-baseline justify-between gap-2 text-[13px] text-zinc-800">
                {when(version.savedAt)}
                <span className="text-[11px] text-zinc-400">{REASON_LABEL[version.reason]}</span>
              </span>
              <span className="truncate text-[11.5px] text-zinc-500">{summary(version)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export function HistoryMenu({ actions }: { actions: DiagramActions }) {
  return (
    <Menu
      width="w-80"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-label="Version history"
          title="Version history"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            open ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <History size={16} />
        </button>
      )}
    >
      {(close) => <VersionList actions={actions} close={close} />}
    </Menu>
  )
}
