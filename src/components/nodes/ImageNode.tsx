import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { ImageNode as ImageNodeType } from '../../types'
import { useDiagramStore } from '../../store/diagramStore'
import { MediaResizeHandles } from './MediaResizeHandles'
import { EditableLabel } from '../common/EditableLabel'
import { LABEL_GAP, LABEL_WIDTH } from '../../layout/config'
import { imageNodeWidth } from '../../layout/sizes'

const IMAGE_SIDES = [Position.Top, Position.Right, Position.Left]

function ImageNodeComponent({ id, data, selected }: NodeProps<ImageNodeType>) {
  const selecting = useDiagramStore((s) => s.tool.kind === 'select')
  const editing = useDiagramStore((s) => s.editingId === id)
  const setEditingId = useDiagramStore((s) => s.setEditingId)
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  // NodeProps dimensions include the measured caption; saved dimensions describe only the artwork.
  const width = useStore((s) => s.nodeLookup.get(id)?.width ?? 160)
  const height = useStore((s) => s.nodeLookup.get(id)?.height ?? 160)
  return (
    <div className="relative flex flex-col items-center" style={{ width: imageNodeWidth(width), gap: LABEL_GAP }}>
      <div
        className={`relative rounded-[3px] bg-white transition-shadow ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        style={{ width, height }}
      >
        <img src={data.src} alt={data.label} draggable={false} className="block h-full w-full rounded-[3px] object-contain" />
        {selected && selecting && !editing && <MediaResizeHandles id={id} kind="image" />}
        {IMAGE_SIDES.map((side) => (
          <Handle key={side} id={side} type="source" position={side} />
        ))}
      </div>
      <EditableLabel
        formatting={data}
        value={data.label}
        editing={editing}
        placeholder="Image name"
        onCommit={(label) => updateNodeData(id, { label })}
        onDone={() => setEditingId(null)}
        style={{ width: LABEL_WIDTH }}
        className="font-diagram text-center text-[12px] leading-[15px] break-words whitespace-pre-wrap text-zinc-900"
      />
      <Handle id={Position.Bottom} type="source" position={Position.Bottom} />
    </div>
  )
}

export const ImageNode = memo(ImageNodeComponent)
