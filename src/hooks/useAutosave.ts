import { useEffect } from 'react'
import { wholeDiagram } from '../lib/document'
import { saveAutosave } from '../lib/persistence'
import { useDiagramStore } from '../store/diagramStore'

const DELAY_MS = 400

/** Persists the diagram to localStorage shortly after every change. */
export function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const save = () => {
      clearTimeout(timer)
      saveAutosave(wholeDiagram(useDiagramStore.getState()))
    }

    const unsubscribe = useDiagramStore.subscribe((state, prev) => {
      const changed =
        state.nodes !== prev.nodes ||
        state.edges !== prev.edges ||
        state.name !== prev.name ||
        state.pages !== prev.pages ||
        state.parked !== prev.parked
      if (!changed) return
      clearTimeout(timer)
      timer = setTimeout(save, DELAY_MS)
    })
    window.addEventListener('beforeunload', save)

    return () => {
      unsubscribe()
      clearTimeout(timer)
      window.removeEventListener('beforeunload', save)
    }
  }, [])
}
