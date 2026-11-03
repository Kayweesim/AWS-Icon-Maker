import { useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { exportDrawio } from '../exporters/drawio'
import { LAYOUT_ANIMATION_MS } from '../layout/config'
import { tidy } from '../layout/tidy'
import { isEmptyLayout } from '../layout/types'
import { downloadBlob, pickFile, slugify } from '../lib/download'
import { exportImage, type ImageFormat } from '../lib/export'
import { wholeDiagram } from '../lib/document'
import { parseDiagram, toFile } from '../lib/persistence'
import { loadSvgImages } from '../lib/svg'
import { recordVersion, type Version } from '../lib/versions'
import { useDiagramStore } from '../store/diagramStore'
import type { AppEdge, AppNode } from '../types'

export type Notice = { kind: 'info' | 'error'; text: string; action?: { label: string; run: () => void } }

export type DiagramActions = {
  newDiagram: () => void
  /** Deletes a page, keeping a version first and offering to undo. */
  deletePage: (id: string) => void
  /** Replaces the diagram with a kept version, keeping the current one first so it can be undone. */
  restoreVersion: (version: Version) => void
  save: () => void
  open: () => Promise<void>
  exportAs: (format: ImageFormat) => Promise<void>
  /** Downloads a .drawio file for draw.io / diagrams.net. */
  exportDrawio: () => Promise<void>
  tidy: () => void
  autoArrange: () => Promise<void>
}

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** Selected node ids, which scope the clean-up actions. */
const selectedNodeIds = (nodes: AppNode[]) => nodes.filter((n) => n.selected).map((n) => n.id)

export function useDiagramActions() {
  const { fitView, getNodes, getNodesBounds } = useReactFlow<AppNode, AppEdge>()
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return
    // Notices with an undo button stay longer so there's time to reach it.
    const timer = setTimeout(() => setNotice(null), notice.action ? 10000 : notice.kind === 'error' ? 6000 : 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const actions = useMemo<DiagramActions>(
    () => ({
      newDiagram: () => {
        const state = useDiagramStore.getState()
        const previous = wholeDiagram(state)
        if (previous.pages.every((page) => page.nodes.length === 0) && previous.pages.length === 1) return
        recordVersion(previous, 'new-diagram')
        state.newDiagram()
        setNotice({
          kind: 'info',
          text: 'Started a new diagram',
          action: { label: 'Undo', run: () => useDiagramStore.getState().loadDiagram(previous) },
        })
      },

      deletePage: (id) => {
        const state = useDiagramStore.getState()
        recordVersion(wholeDiagram(state), 'delete-page')
        const deleted = state.deletePage(id)
        if (!deleted) return
        setNotice({
          kind: 'info',
          text: `Deleted “${deleted.page.name}”`,
          action: { label: 'Undo', run: () => useDiagramStore.getState().restorePage(deleted) },
        })
      },

      restoreVersion: (version) => {
        const state = useDiagramStore.getState()
        const current = wholeDiagram(state)
        recordVersion(current, 'restore')
        state.loadDiagram(version.diagram)
        setNotice({
          kind: 'info',
          text: `Restored the version from ${timeOf(version.savedAt)}`,
          action: { label: 'Undo', run: () => useDiagramStore.getState().loadDiagram(current) },
        })
        nextFrame().then(() => fitView({ padding: 0.15, maxZoom: 1, duration: 200 }))
      },

      save: () => {
        const state = useDiagramStore.getState()
        const json = JSON.stringify(toFile(wholeDiagram(state)), null, 2)
        downloadBlob(new Blob([json], { type: 'application/json' }), `${slugify(state.name)}.json`)
      },

      open: async () => {
        const file = await pickFile('.json,application/json')
        if (!file) return
        try {
          const diagram = parseDiagram(JSON.parse(await file.text()))
          // Opening can replace pages that share an id with the file's, so keep what was there.
          recordVersion(wholeDiagram(useDiagramStore.getState()), 'open')
          // Additive: pages already here are kept, and only those the file also has are replaced.
          useDiagramStore.getState().importDiagram(diagram)
          await nextFrame()
          fitView({ padding: 0.15, maxZoom: 1, duration: 200 })
        } catch (error) {
          setNotice({ kind: 'error', text: `Couldn’t open ${file.name}: ${errorMessage(error)}` })
        }
      },

      exportAs: async (format) => {
        const nodes = getNodes()
        if (nodes.length === 0) {
          setNotice({ kind: 'info', text: 'Add something to the canvas before exporting' })
          return
        }
        // Hide selection outlines and resize handles in the exported image.
        useDiagramStore.getState().clearSelection()
        await nextFrame()
        try {
          await exportImage(format, getNodesBounds(nodes), slugify(useDiagramStore.getState().name))
        } catch (error) {
          setNotice({ kind: 'error', text: `Export failed: ${errorMessage(error)}` })
        }
      },

      exportDrawio: async () => {
        const { name, nodes, edges } = useDiagramStore.getState()
        if (nodes.length === 0) {
          setNotice({ kind: 'info', text: 'Add something to the canvas before exporting' })
          return
        }
        try {
          // Icons are embedded so the file opens anywhere, offline.
          const images = await loadSvgImages(nodes.flatMap((n) => (n.type === 'icon' ? [n.data.iconPath] : [])))
          const xml = exportDrawio({ name, nodes, edges }, images)
          downloadBlob(new Blob([xml], { type: 'application/xml' }), `${slugify(name)}.drawio`)
        } catch (error) {
          setNotice({ kind: 'error', text: `draw.io export failed: ${errorMessage(error)}` })
        }
      },

      tidy: () => {
        const { nodes, edges, applyLayout } = useDiagramStore.getState()
        if (nodes.length === 0) return
        const result = tidy(nodes, edges, { selectedIds: selectedNodeIds(nodes) })
        if (isEmptyLayout(result)) setNotice({ kind: 'info', text: 'Already tidy' })
        else applyLayout(result)
      },

      autoArrange: async () => {
        const { nodes, edges } = useDiagramStore.getState()
        if (nodes.length === 0) return
        const selectedIds = selectedNodeIds(nodes)
        try {
          // ELK is only loaded when first used.
          const { autoArrange } = await import('../layout/autoArrange')
          const result = await autoArrange(nodes, edges, { selectedIds })
          if (isEmptyLayout(result)) {
            setNotice({ kind: 'info', text: 'Already arranged' })
            return
          }
          useDiagramStore.getState().applyLayout(result)
          if (selectedIds.length === 0) {
            setTimeout(() => fitView({ padding: 0.15, maxZoom: 1, duration: 300 }), LAYOUT_ANIMATION_MS + 20)
          }
        } catch (error) {
          setNotice({ kind: 'error', text: `Auto-arrange failed: ${errorMessage(error)}` })
        }
      },
    }),
    [fitView, getNodes, getNodesBounds],
  )

  return { actions, notice, dismissNotice: () => setNotice(null) }
}
