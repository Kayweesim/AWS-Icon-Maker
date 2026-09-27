import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { ImageNode as ImageNodeType } from '../../types'

const IMAGE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function ImageNodeComponent({ data, selected, width, height }: NodeProps<ImageNodeType>) {
  return (
    <div
      className={`relative overflow-hidden rounded-[3px] bg-white transition-shadow ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      style={{ width, height }}
    >
      <img src={data.src} alt={data.label} draggable={false} className="block h-full w-full object-contain" />
      {IMAGE_SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} />
      ))}
    </div>
  )
}

export const ImageNode = memo(ImageNodeComponent)
