import { useReactFlow } from '@xyflow/react'
import { useEffect } from 'react'
import { canvasPointer } from '../lib/pointer'
import { useDiagramStore } from '../store/diagramStore'
import { GRID_SIZE } from '../types'

export type ShortcutHandlers = {
  save?: () => void
  open?: () => void
  toggleHelp?: () => void
  tidy?: () => void
  autoArrange?: () => void
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useDiagramStore.getState()
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      // While the quick-add search is still empty, app shortcuts (⌘Z, ⌘A, Shift+T, …) close it and run.
      const target = event.target
      const emptyQuickAdd = target instanceof HTMLInputElement && target.dataset.quickAdd !== undefined && !target.value
      const appShortcut = mod || (event.shiftKey && (key === 't' || key === 'a' || event.code === 'Digit1')) || key === '?'
      if (emptyQuickAdd && appShortcut) store.closeQuickAdd()
      else if (isTyping(target)) return

      const run = (action: () => void) => {
        event.preventDefault()
        action()
      }

      if (mod) {
        if (key === 'z' && event.shiftKey) return run(store.redo)
        if (key === 'z') return run(store.undo)
        if (key === 'y') return run(store.redo)
        if (key === 'c') return run(store.copy)
        if (key === 'x') return run(store.cut)
        if (key === 'v') return run(store.paste)
        if (key === 'd') return run(store.duplicate)
        if (key === 'a') return run(store.selectAll)
        if (key === 's' && handlers.save) return run(handlers.save)
        if (key === 'o' && handlers.open) return run(handlers.open)
        return
      }

      if (event.altKey) return

      if (event.shiftKey && key === 't' && handlers.tidy) return run(handlers.tidy)
      if (event.shiftKey && key === 'a' && handlers.autoArrange) return run(handlers.autoArrange)

      // Tools: A draws an arrow (from the selected service), T places text. Pressing again cancels.
      if (!event.shiftKey && key === 'a') {
        return run(() => (store.tool.kind === 'arrow' ? store.cancelTool() : store.startArrowMode()))
      }
      if (!event.shiftKey && key === 't') {
        return run(() => (store.tool.kind === 'text' ? store.cancelTool() : store.startTextMode()))
      }
      // S opens quick add at the cursor, or in the middle of the canvas if the cursor is elsewhere.
      if (!event.shiftKey && key === 's') {
        return run(() => {
          const canvas = document.querySelector('.react-flow')?.getBoundingClientRect()
          const screen = canvasPointer() ?? (canvas && { x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 })
          if (!screen) return
          store.cancelTool()
          store.openQuickAdd({ screen, flow: screenToFlowPosition(screen) })
        })
      }
      if (key === 'escape') return run(store.tool.kind !== 'select' ? store.cancelTool : store.clearSelection)

      if (key === 'delete' || key === 'backspace') return run(store.deleteSelection)

      if (key === 'enter' || key === 'f2') {
        const selected = [...store.nodes, ...store.edges].filter((item) => item.selected)
        if (selected.length === 1) return run(() => store.setEditingId(selected[0].id))
        return
      }

      if (ARROWS[event.key]) {
        const [dx, dy] = ARROWS[event.key]
        const step = GRID_SIZE * (event.shiftKey ? 5 : 1)
        return run(() => store.nudgeSelection(dx * step, dy * step))
      }

      if (event.shiftKey && event.code === 'Digit1') return run(() => fitView({ padding: 0.2, duration: 200 }))
      if (key === '=' || key === '+') return run(() => zoomIn({ duration: 150 }))
      if (key === '-') return run(() => zoomOut({ duration: 150 }))
      if (key === '?' && handlers.toggleHelp) return run(handlers.toggleHelp)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fitView, zoomIn, zoomOut, screenToFlowPosition, handlers])
}
