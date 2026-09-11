import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { groupIconPath, groupStyle } from '../../data/groups'
import { useDiagramStore } from '../../store/diagramStore'
import type { GroupNode as GroupNodeType } from '../../types'
import { EditableLabel } from '../common/EditableLabel'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const BORDER = 1.5

function GroupNodeComponent({ id, data, selected }: NodeProps<GroupNodeType>) {
  const editing = useDiagramStore((s) => s.editingId === id)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const beginHistoryBatch = useDiagramStore((s) => s.beginHistoryBatch)
  const endHistoryBatch = useDiagramStore((s) => s.endHistoryBatch)
  const style = groupStyle(data.groupType)
  const iconPath = groupIconPath(data.groupType)

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        onResizeStart={beginHistoryBatch}
        onResizeEnd={endHistoryBatch}
        lineClassName="!border-blue-500"
        handleClassName="!h-2 !w-2 !rounded-[2px] !border-blue-500 !bg-white"
      />
      <div
        className="relative h-full w-full"
        style={{
          border: `${BORDER}px ${style.dashed ? 'dashed' : 'solid'} ${style.stroke}`,
          background: style.fill ?? 'transparent',
        }}
      >
        {iconPath && (
          // Group icons sit flush in the top-left corner at their predefined size.
          <img
            src={iconPath}
            alt=""
            width={32}
            height={32}
            draggable={false}
            className="absolute block h-8 w-8"
            style={{ top: -BORDER, left: -BORDER }}
          />
        )}
        <div className={`absolute top-0 right-2 ${iconPath ? 'left-10 pt-2' : 'left-2 pt-1.5'}`}>
          <EditableLabel
            value={data.label}
            editing={editing}
            placeholder="Group name"
            onCommit={(label) => updateNodeData(id, { label })}
            onDone={() => setEditingId(null)}
            style={{ color: style.text }}
            // Long labels wrap rather than being cut off; clean-up leaves room for them.
            className="font-diagram block w-full text-[12px] leading-4 break-words whitespace-pre-wrap"
          />
        </div>
      </div>
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} />
      ))}
    </>
  )
}

export const GroupNode = memo(GroupNodeComponent)
