import { useReactFlow, type XYPosition } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { copySelection, type ClipboardData } from '../lib/clipboard'
import { clipboardText, CLIPBOARD_MIME, CLIPBOARD_PREFIX, parseClipboard, serializeClipboard } from '../lib/clipboardFormat'
import { firstPastedImage, IMAGE_DROP_FORMATS } from '../lib/imageDrop'
import { canvasPointer } from '../lib/pointer'
import { useDiagramStore } from '../store/diagramStore'

function usesNativeClipboard(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null
  return !!element?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]') ||
    document.querySelector('[role="dialog"]') !== null
}

/** Native events work with keyboard shortcuts and the browser's Paste command, without permissions. */
export function useCanvasClipboard(
  importImage: (file: File, point: XYPosition) => void,
  reportError: (message: string) => void,
) {
  const { screenToFlowPosition } = useReactFlow()
  const cached = useRef<{ text: string; selection: ClipboardData; local: boolean } | null>(null)
  useEffect(() => {
    const pastePoint = () => {
      const canvas = document.querySelector('.react-flow')?.getBoundingClientRect()
      const screen = canvasPointer() ?? (canvas && { x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 })
      return screen ? screenToFlowPosition(screen) : undefined
    }
    const onCopy = (event: ClipboardEvent) => {
      if (event.defaultPrevented || usesNativeClipboard(event.target) || !event.clipboardData) return
      const store = useDiagramStore.getState()
      const selection = copySelection(store.nodes, store.edges)
      if (!selection) {
        // Edges alone cannot be pasted without their endpoints, but cutting still removes them.
        if (event.type === 'cut' && store.edges.some((edge) => edge.selected)) {
          event.preventDefault()
          store.deleteSelection()
        }
        return
      }
      event.preventDefault()
      const text = serializeClipboard(selection)
      try {
        // Plain text survives browsers/OSes that discard custom clipboard MIME types.
        event.clipboardData.setData('text/plain', CLIPBOARD_PREFIX + text)
        try { event.clipboardData.setData(CLIPBOARD_MIME, text) } catch { /* Plain text fallback is sufficient. */ }
      } catch {
        reportError('Could not copy the selection. Try a smaller selection or save it as JSON.')
        return // Never delete a cut selection if writing to the clipboard failed.
      }
      if (event.type === 'cut') store.cut()
      else store.copy()
      cached.current = { text, selection: useDiagramStore.getState().clipboard!, local: true }
    }
    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || usesNativeClipboard(event.target) || !event.clipboardData) return
      const transfer = event.clipboardData
      const text = clipboardText(transfer)
      if (text !== null) {
        event.preventDefault()
        try {
          if (cached.current?.text !== text) cached.current = { text, selection: parseClipboard(text), local: false }
          const { selection, local } = cached.current
          useDiagramStore.getState().paste(selection, local ? undefined : pastePoint())
        } catch (error) {
          reportError(error instanceof Error ? `Could not paste: ${error.message}` : 'Could not paste this selection')
        }
        return
      }
      const image = firstPastedImage(transfer)
      if (image) {
        event.preventDefault()
        const point = pastePoint()
        if (point) importImage(image, point)
      } else if (Array.from(transfer.items).some((item) => item.kind === 'file') || transfer.files.length) {
        event.preventDefault()
        reportError(`Unsupported or empty file. Paste a ${IMAGE_DROP_FORMATS} image.`)
      }
    }
    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCopy)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('cut', onCopy)
      window.removeEventListener('paste', onPaste)
    }
  }, [importImage, reportError, screenToFlowPosition])
}
