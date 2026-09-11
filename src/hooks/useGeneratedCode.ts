import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { CodeFormat, CodeFormatOptions } from '../components/code/codeFormats'
import { toExportInput } from '../exporters/model'
import { highlight, type CodeLanguage } from '../lib/highlight'
import { useDiagramStore } from '../store/diagramStore'

/** Code for the current diagram, regenerated as it changes. */
export function useGeneratedCode(format: CodeFormat, options: CodeFormatOptions): string {
  const diagram = useDiagramStore(useShallow((s) => ({ name: s.name, nodes: s.nodes, edges: s.edges })))
  // Keep dragging smooth: regenerate at lower priority than canvas updates.
  const { name, nodes, edges } = useDeferredValue(diagram)

  return useMemo(() => {
    try {
      return format.generate(toExportInput(name, nodes, edges), options)
    } catch (error) {
      // Exporters are written not to throw; this is a last line of defence.
      return `Export failed: ${error instanceof Error ? error.message : String(error)}\n`
    }
  }, [format, options, name, nodes, edges])
}

/** Highlighted HTML for `code`, or null until the highlighter has loaded. */
export function useHighlightedCode(code: string, language: CodeLanguage): string | null {
  const [result, setResult] = useState<{ language: CodeLanguage; html: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    highlight(code, language)
      .then((html) => !cancelled && setResult({ language, html }))
      .catch(() => !cancelled && setResult(null))
    return () => {
      cancelled = true
    }
  }, [code, language])

  // While a newer version highlights, keep showing the previous one for the same language.
  return result?.language === language ? result.html : null
}
