import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo, useEffect } from 'react'
import { TEXT_FONT_SIZE, TEXT_LINE_HEIGHT, TEXT_MAX_WIDTH, TEXT_PADDING } from '../../layout/config'
import { useDiagramStore } from '../../store/diagramStore'
import type { TextNode as TextNodeType } from '../../types'
import { EditableLabel } from '../common/EditableLabel'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function TextNodeComponent({ id, data, selected }: NodeProps<TextNodeType>) {
  const editing = useDiagramStore((s) => s.editingId === id)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const fontSize = data.fontSize ?? TEXT_FONT_SIZE

  // A text box left empty (Escape, or committing nothing) is discarded.
  useEffect(() => {
    if (!editing) useDiagramStore.getState().removeEmptyText(id)
  }, [editing, id])

  return (
    <div
      className={`relative rounded-[3px] ${selected && !editing ? 'outline-1 outline-offset-2 outline-blue-500 outline-dashed' : ''}`}
      style={{ maxWidth: TEXT_MAX_WIDTH, padding: `${TEXT_PADDING.y}px ${TEXT_PADDING.x}px` }}
    >
      <EditableLabel
        value={data.label}
        editing={editing}
        placeholder="Type something"
        onCommit={(label) => updateNodeData(id, { label })}
        onDone={() => setEditingId(null)}
        style={{ fontSize, lineHeight: TEXT_LINE_HEIGHT, ...(editing && { width: TEXT_MAX_WIDTH - TEXT_PADDING.x * 2 }) }}
        className="font-diagram block break-words whitespace-pre-wrap text-zinc-900"
      />
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} />
      ))}
    </div>
  )
}

export const TextNode = memo(TextNodeComponent)
