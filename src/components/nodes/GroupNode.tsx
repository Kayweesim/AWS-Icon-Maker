import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { groupIconPath, groupStyle } from '../../data/groups'
import { HANDLE_SIDES, handleId, handlePercents, type HandleSide } from '../../layout/handles'
import { useDiagramStore } from '../../store/diagramStore'
import type { GroupNode as GroupNodeType } from '../../types'
import { EditableLabel } from '../common/EditableLabel'

const POSITIONS: Record<HandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}
const BORDER = 1.5

function GroupNodeComponent({ id, data, selected, width, height }: NodeProps<GroupNodeType>) {
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
        {/* Only the header (icon and label text) selects and drags the group; see index.css. */}
        {iconPath && (
          // Group icons sit flush in the top-left corner at their predefined size.
          <img
            data-group-header
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
          <div data-group-header className={editing ? 'block' : 'inline-block min-h-4 max-w-full min-w-6 align-top'}>
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
      </div>
      {/* Several connection points along each side, so arrows can attach where they belong. */}
      {HANDLE_SIDES.flatMap((side) => {
        const alongSide = side === 'left' || side === 'right' ? (height ?? style.height) : (width ?? style.width)
        return handlePercents(alongSide).map((percent) => (
          <Handle
            key={handleId(side, percent)}
            id={handleId(side, percent)}
            type="source"
            position={POSITIONS[side]}
            style={side === 'left' || side === 'right' ? { top: `${percent}%` } : { left: `${percent}%` }}
          />
        ))
      })}
    </>
  )
}

export const GroupNode = memo(GroupNodeComponent)
