import { useReactFlow } from '@xyflow/react'
import { useEffect } from 'react'
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
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const store = useDiagramStore.getState()
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

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

      if (key === 'delete' || key === 'backspace') return run(store.deleteSelection)
      if (key === 'escape') return run(store.clearSelection)

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
  }, [fitView, zoomIn, zoomOut, handlers])
}
