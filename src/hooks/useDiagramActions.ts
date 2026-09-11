import { useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { downloadBlob, pickFile, slugify } from '../lib/download'
import { exportImage, type ImageFormat } from '../lib/export'
import { parseDiagram, toFile } from '../lib/persistence'
import { useDiagramStore } from '../store/diagramStore'
import type { AppEdge, AppNode } from '../types'

export type Notice = { kind: 'info' | 'error'; text: string }

export type DiagramActions = {
  newDiagram: () => void
  save: () => void
  open: () => Promise<void>
  exportAs: (format: ImageFormat) => Promise<void>
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function useDiagramActions() {
  const { fitView, getNodes, getNodesBounds } = useReactFlow<AppNode, AppEdge>()
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), notice.kind === 'error' ? 6000 : 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const actions = useMemo<DiagramActions>(
    () => ({
      newDiagram: () => {
        const { nodes, newDiagram } = useDiagramStore.getState()
        if (nodes.length === 0) return
        newDiagram()
        setNotice({ kind: 'info', text: 'Started a new diagram — undo to bring the old one back' })
      },

      save: () => {
        const { name, nodes, edges } = useDiagramStore.getState()
        const json = JSON.stringify(toFile({ name, nodes, edges }), null, 2)
        downloadBlob(new Blob([json], { type: 'application/json' }), `${slugify(name)}.json`)
      },

      open: async () => {
        const file = await pickFile('.json,application/json')
        if (!file) return
        try {
          const diagram = parseDiagram(JSON.parse(await file.text()))
          useDiagramStore.getState().loadDiagram(diagram)
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
    }),
    [fitView, getNodes, getNodesBounds],
  )

  return { actions, notice, dismissNotice: () => setNotice(null) }
}
