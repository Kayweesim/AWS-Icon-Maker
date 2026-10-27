import { groupStyle } from '../../data/groups'
import { DEFAULT_EDGE_TEXT_COLOR, DEFAULT_TEXT_COLOR, normalizeColor } from '../../lib/appearance'
import { useDiagramStore } from '../../store/diagramStore'
import type { AppEdge, AppNode, TextFormatting } from '../../types'
import { ColorField, Field } from './controls'

const common = <T,>(values: T[]): T | undefined => values.every((value) => value === values[0]) ? values[0] : undefined

export function TextFormattingFields({ nodes, edges }: { nodes: AppNode[]; edges: AppEdge[] }) {
  const setTextFormatting = useDiagramStore((state) => state.setTextFormatting)
  const data: TextFormatting[] = [...nodes.map((node) => node.data), ...edges.map((edge) => edge.data ?? {})]
  const bold = common(data.map((item) => item.bold === true))
  const underline = common(data.map((item) => item.underline === true))
  const color = common([
    ...nodes.map((node) => normalizeColor(node.data.textColor) ?? (node.type === 'awsGroup' ? groupStyle(node.data.groupType).text : DEFAULT_TEXT_COLOR)),
    ...edges.map((edge) => normalizeColor(edge.data?.textColor) ?? DEFAULT_EDGE_TEXT_COLOR),
  ].map((value) => normalizeColor(value)!))
  const update = (patch: TextFormatting) => setTextFormatting(nodes.map((node) => node.id), edges.map((edge) => edge.id), patch)

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3">
      <Field label="Text formatting">
        <div className="flex gap-1.5">
          {([
            ['Bold', 'B', bold, () => update({ bold: !bold })],
            ['Underline', 'U', underline, () => update({ underline: !underline })],
          ] as const).map(([label, letter, active, action]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={active === undefined ? `${label} (mixed)` : label}
              aria-pressed={active === undefined ? 'mixed' : active}
              onClick={action}
              className={`h-8 flex-1 rounded-md border text-sm focus-visible:outline-2 focus-visible:outline-blue-500 ${active ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'} ${label === 'Bold' ? 'font-bold' : 'underline'}`}
            >{letter}{active === undefined && <span className="ml-1 text-[10px] font-normal no-underline">Mixed</span>}</button>
          ))}
        </div>
      </Field>
      <ColorField label="Text colour" value={color} onCommit={(textColor) => update({ textColor })} />
      <button
        type="button"
        onClick={() => update({ bold: undefined, underline: undefined, textColor: undefined })}
        className="h-8 rounded-md border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50"
      >Reset text formatting</button>
      <p className="text-[11.5px] leading-snug text-zinc-500">Applies to the entire text or label. Custom colours apply with Enter or Apply.</p>
    </div>
  )
}
