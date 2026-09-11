import type { Rect } from '@xyflow/react'
import { toPng, toSvg } from 'html-to-image'
import { downloadBlob, downloadUrl } from './download'

export type ImageFormat = 'png' | 'svg'

const PADDING = 32

const EXCLUDED_CLASSES = ['react-flow__handle', 'react-flow__resize-control', 'react-flow__nodesselection']

function include(node: HTMLElement) {
  const classes = node.classList
  return !classes || !EXCLUDED_CLASSES.some((name) => classes.contains(name))
}

/** Renders the diagram (not the visible viewport) to an image and downloads it. */
export async function exportImage(format: ImageFormat, bounds: Rect, filename: string) {
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewport) throw new Error('Canvas not found')

  const width = Math.ceil(bounds.width + PADDING * 2)
  const height = Math.ceil(bounds.height + PADDING * 2)
  const options = {
    width,
    height,
    backgroundColor: '#ffffff',
    filter: include,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${PADDING - bounds.x}px, ${PADDING - bounds.y}px) scale(1)`,
    },
  }

  if (format === 'png') {
    downloadUrl(await toPng(viewport, { ...options, pixelRatio: 2 }), `${filename}.png`)
    return
  }

  const dataUrl = await toSvg(viewport, options)
  const svg = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1))
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${filename}.svg`)
}
