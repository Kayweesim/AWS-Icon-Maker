import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { ImageNode as ImageNodeType } from '../../types'
import { useDiagramStore } from '../../store/diagramStore'
import { MediaResizeHandles } from './MediaResizeHandles'

const IMAGE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function ImageNodeComponent({ id, data, selected, width, height }: NodeProps<ImageNodeType>) {
  const selecting = useDiagramStore((s) => s.tool.kind === 'select')
  return (
    <div
      className={`relative rounded-[3px] bg-white transition-shadow ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      style={{ width, height }}
    >
      <img src={data.src} alt={data.label} draggable={false} className="block h-full w-full rounded-[3px] object-contain" />
      {selected && selecting && <MediaResizeHandles id={id} kind="image" />}
      {IMAGE_SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} />
      ))}
    </div>
  )
}

export const ImageNode = memo(ImageNodeComponent)
