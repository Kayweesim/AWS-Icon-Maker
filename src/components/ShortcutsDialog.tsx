import { X } from 'lucide-react'
import { useEffect } from 'react'
import { mod, shift } from '../lib/platform'

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Edit',
    items: [
      ['Undo', `${mod}Z`],
      ['Redo', `${shift}${mod}Z`],
      ['Copy / Cut / Paste', `${mod}C  ${mod}X  ${mod}V`],
      ['Duplicate', `${mod}D`],
      ['Delete', '⌫'],
      ['Delete a group, keep contents', `${mod}click group, ⌫`],
      ['Rename', 'Enter  or  double-click'],
      ['Nudge (×5 with Shift)', '← ↑ → ↓'],
    ],
  },
  {
    title: 'Select',
    items: [
      ['Select all', `${mod}A`],
      ['Add to selection', `${shift}click`],
      ['Box select', 'Drag on canvas'],
      ['Box select services only', `${shift}drag`],
      ['Deselect', 'Esc'],
    ],
  },
  {
    title: 'Draw',
    items: [
      ['Quick add at cursor', 'S'],
      ['Arrow from selected service', 'A, then click a service'],
      ['Keep chaining arrows', `${shift}click`],
      ['Add text', 'T, then click'],
      ['Cancel tool', 'Esc'],
    ],
  },
  {
    title: 'Clean up',
    items: [
      ['Tidy', `${shift}T`],
      ['Auto-arrange', `${shift}A`],
      ['Scope', 'Selection, or everything'],
    ],
  },
  {
    title: 'View',
    items: [
      ['Pan', 'Scroll  or  Space + drag'],
      ['Zoom', `${mod}scroll  or  + / −`],
      ['Fit diagram', `${shift}1`],
    ],
  },
  {
    title: 'File',
    items: [
      ['Save JSON', `${mod}S`],
      ['Open JSON', `${mod}O`],
      ['Shortcuts', '?'],
    ],
  },
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/15 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-zinc-900">Keyboard shortcuts</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">{section.title}</h3>
              <dl className="flex flex-col gap-1">
                {section.items.map(([action, keys]) => (
                  <div key={action} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <dt className="text-zinc-600">{action}</dt>
                    <dd className="shrink-0 font-mono text-[11.5px] whitespace-pre text-zinc-800">{keys}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
