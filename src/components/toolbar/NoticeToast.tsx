import { X } from 'lucide-react'
import type { Notice } from '../../hooks/useDiagramActions'

export function NoticeToast({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  if (!notice) return null
  const error = notice.kind === 'error'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
      <div
        role={error ? 'alert' : 'status'}
        className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-lg px-3.5 py-2 text-[13px] shadow-panel ${
          error ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'
        }`}
      >
        <span>{notice.text}</span>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="rounded p-0.5 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
