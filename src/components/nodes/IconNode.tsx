import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { useDiagramStore } from '../../store/diagramStore'
import type { IconNode as IconNodeType } from '../../types'
import { EditableLabel } from '../common/EditableLabel'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function IconNodeComponent({ id, data, selected }: NodeProps<IconNodeType>) {
  const editing = useDiagramStore((s) => s.editingId === id)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)

  return (
    <div className="flex w-24 flex-col items-center gap-1.5">
      <div
        className={`relative rounded-md p-0.5 transition-shadow ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
      >
        {/* Icons are shown at their predefined size, unaltered, per AWS guidelines. */}
        <img src={data.iconPath} alt="" width={48} height={48} draggable={false} className="block h-12 w-12" />
        {SIDES.map((side) => (
          <Handle key={side} id={side} type="source" position={side} />
        ))}
      </div>
      <EditableLabel
        value={data.label}
        editing={editing}
        placeholder="Label"
        onCommit={(label) => updateNodeData(id, { label })}
        onDone={() => setEditingId(null)}
        className="font-diagram w-full text-center text-[12px] leading-tight break-words whitespace-pre-wrap text-zinc-900"
      />
    </div>
  )
}

export const IconNode = memo(IconNodeComponent)
