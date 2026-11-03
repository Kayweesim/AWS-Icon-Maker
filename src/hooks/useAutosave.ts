import { useEffect } from 'react'
import { wholeDiagram } from '../lib/document'
import { saveAutosave } from '../lib/persistence'
import { AUTO_VERSION_INTERVAL_MS, dropOldestVersion, latestVersionTime, recordVersion } from '../lib/versions'
import { useDiagramStore } from '../store/diagramStore'

const DELAY_MS = 400

/**
 * Persists the diagram to localStorage shortly after every change, and keeps a version in the
 * history every few minutes while editing continues.
 */
export function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    // Autosave is shared between tabs: a tab with nothing new to save must not overwrite newer work.
    let unsaved = false
    const save = () => {
      clearTimeout(timer)
      if (!unsaved) return
      unsaved = false
      const diagram = wholeDiagram(useDiagramStore.getState())
      // Old versions give way if storage is full: the latest work matters most.
      saveAutosave(diagram, dropOldestVersion)
      if (Date.now() - latestVersionTime() >= AUTO_VERSION_INTERVAL_MS) recordVersion(diagram, 'auto')
    }

    const unsubscribe = useDiagramStore.subscribe((state, prev) => {
      const changed =
        state.nodes !== prev.nodes ||
        state.edges !== prev.edges ||
        state.name !== prev.name ||
        state.pages !== prev.pages ||
        state.parked !== prev.parked
      if (!changed) return
      unsaved = true
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
