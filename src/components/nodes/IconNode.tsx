import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { LABEL_GAP, LABEL_WIDTH, LEGACY_ICON_SIZE } from '../../layout/config'
import { iconNodeWidth } from '../../layout/sizes'
import { useDiagramStore } from '../../store/diagramStore'
import type { IconNode as IconNodeType } from '../../types'
import { EditableLabel } from '../common/EditableLabel'
import { MediaResizeHandles } from './MediaResizeHandles'

const ICON_SIDES = [Position.Top, Position.Right, Position.Left]

function IconNodeComponent({ id, data, selected }: NodeProps<IconNodeType>) {
  const editing = useDiagramStore((s) => s.editingId === id)
  const selecting = useDiagramStore((s) => s.tool.kind === 'select')
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const size = data.iconSize ?? LEGACY_ICON_SIZE

  return (
    <div className="relative flex flex-col items-center" style={{ width: iconNodeWidth(size), gap: LABEL_GAP }}>
      <div
        className={`relative rounded-[3px] transition-shadow ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        style={{ width: size, height: size }}
      >
        {/* Resize the artwork independently of the fixed-width label below it. */}
        <img src={data.iconPath} alt="" width={size} height={size} draggable={false} className="block h-full w-full" />
        {selected && selecting && !editing && <MediaResizeHandles id={id} kind="icon" />}
        {ICON_SIDES.map((side) => (
          <Handle key={side} id={side} type="source" position={side} />
        ))}
      </div>
      <EditableLabel
        value={data.label}
        editing={editing}
        placeholder="Label"
        onCommit={(label) => updateNodeData(id, { label })}
        onDone={() => setEditingId(null)}
        style={{ width: LABEL_WIDTH }}
        className="font-diagram text-center text-[12px] leading-[15px] break-words whitespace-pre-wrap text-zinc-900"
      />
      {/* The bottom handle sits below the label, so arrows from underneath don't cross it. */}
      <Handle id={Position.Bottom} type="source" position={Position.Bottom} />
    </div>
  )
}

export const IconNode = memo(IconNodeComponent)
