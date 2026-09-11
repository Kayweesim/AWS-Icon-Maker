import type { XYPosition } from '@xyflow/react'

// Last mouse position over the canvas, in screen coordinates. Kept outside React state so
// tracking the mouse doesn't re-render anything.
let pointer: XYPosition | null = null

export const setCanvasPointer = (point: XYPosition | null) => {
  pointer = point
}

export const canvasPointer = () => pointer
