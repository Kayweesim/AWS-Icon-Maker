/**
 * Mirrors the canvas into the room and back.
 *
 * Outgoing: local edits are projected to a clean `SharedDoc` (no selection, no drag state) and
 * published on a short debounce, which the Liveblocks middleware turns into storage updates.
 * Incoming: the middleware replaces `doc`, we validate it and merge it into the canvas.
 *
 * `agreed` is the last document this client and the room agree on; comparing against it is what
 * keeps a local publish from bouncing back as a remote change, and vice versa.
 */

import { wholeDiagram } from '../lib/document'
import { parseDiagram } from '../lib/persistence'
import { useDiagramStore } from '../store/diagramStore'
import type { SharedDoc } from '../types'
import { PUSH_DEBOUNCE_MS } from './config'

export type Sync = {
  /** Publishes the current canvas immediately. Call before entering a room so it seeds storage. */
  flush: () => void
  stop: () => void
}

export function startSync(): Sync {
  let agreed = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  let applying = false

  const flush = () => {
    clearTimeout(timer)
    const state = useDiagramStore.getState()
    const doc: SharedDoc = wholeDiagram(state)
    const json = JSON.stringify(doc)
    if (json === agreed) return
    agreed = json
    state.publishDoc(doc)
  }

  const receive = (doc: SharedDoc) => {
    let parsed
    try {
      // A room is shared, so treat what arrives like any other untrusted diagram.
      parsed = parseDiagram(doc)
    } catch {
      return
    }
    applying = true
    try {
      useDiagramStore.getState().applyRemoteDoc(parsed)
    } finally {
      applying = false
    }
  }

  const unsubscribe = useDiagramStore.subscribe((state, prev) => {
    if (state.doc !== prev.doc && !applying) {
      const json = JSON.stringify(state.doc)
      if (json !== agreed) {
        agreed = json
        receive(state.doc)
      }
    }
    const changed =
      state.nodes !== prev.nodes ||
      state.edges !== prev.edges ||
      state.name !== prev.name ||
      state.pages !== prev.pages ||
      state.parked !== prev.parked
    if (changed) {
      clearTimeout(timer)
      timer = setTimeout(flush, PUSH_DEBOUNCE_MS)
    }
  })

  return {
    flush,
    stop: () => {
      clearTimeout(timer)
      unsubscribe()
    },
  }
}
