import { ChevronRight } from 'lucide-react'
import type { ArrowPreset } from '../../data/arrows'
import { useDiagramStore } from '../../store/diagramStore'

const STROKE = '#545B64'

/** A small drawing of the arrow style. */
function ArrowSample({ preset }: { preset: ArrowPreset }) {
  const { dashed, arrows } = preset.style
  return (
    <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden className="shrink-0">
      <line x1="3" y1="6" x2="37" y2="6" stroke={STROKE} strokeWidth="1.5" strokeDasharray={dashed ? '4 3' : undefined} />
      {arrows !== 'none' && <path d="M32,2 L37,6 L32,10" fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />}
      {arrows === 'both' && <path d="M8,2 L3,6 L8,10" fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />}
    </svg>
  )
}

type Props = { presets: ArrowPreset[]; open: boolean; onToggle: () => void }

export function ArrowPalette({ presets, open, onToggle }: Props) {
  const activePreset = useDiagramStore((s) => (s.tool.kind === 'arrow' ? s.tool.preset : null))
  const hasSelectedEdges = useDiagramStore((s) => s.edges.some((e) => e.selected))
  const pickArrowPreset = useDiagramStore((s) => s.pickArrowPreset)

  return (
    <section className="border-b border-zinc-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <ChevronRight size={14} className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1">Arrows</span>
        <span className="text-[11px] font-normal text-zinc-400 tabular-nums">{presets.length}</span>
      </button>
      {open && (
        <div className="px-2 pb-3">
          <div className="grid grid-cols-2 gap-x-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.description}
                aria-pressed={activePreset === preset.id}
                onClick={() => pickArrowPreset(preset.id)}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors ${
                  activePreset === preset.id ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-zinc-100'
                }`}
              >
                <ArrowSample preset={preset} />
                <span className="text-[11.5px] leading-tight text-zinc-700">{preset.label}</span>
              </button>
            ))}
          </div>
          <p className="px-1.5 pt-2 text-[11px] leading-snug text-zinc-400">
            {hasSelectedEdges
              ? 'Click a style to apply it to the selected arrows.'
              : 'Click a style, then click two services. Or select a service and press A.'}
          </p>
        </div>
      )}
    </section>
  )
}
