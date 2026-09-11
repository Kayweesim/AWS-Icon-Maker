import { useEffect } from 'react'
import { saveAutosave } from '../lib/persistence'
import { useDiagramStore } from '../store/diagramStore'

const DELAY_MS = 400

/** Persists the diagram to localStorage shortly after every change. */
export function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const save = () => {
      clearTimeout(timer)
      const { name, nodes, edges } = useDiagramStore.getState()
      saveAutosave({ name, nodes, edges })
    }

    const unsubscribe = useDiagramStore.subscribe((state, prev) => {
      if (state.nodes === prev.nodes && state.edges === prev.edges && state.name === prev.name) return
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
