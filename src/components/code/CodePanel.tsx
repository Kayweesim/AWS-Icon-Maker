import { Check, Copy, Download, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { MermaidIconSet } from '../../exporters/mermaid'
import { useGeneratedCode } from '../../hooks/useGeneratedCode'
import { downloadBlob } from '../../lib/download'
import { useDiagramStore } from '../../store/diagramStore'
import { Segmented } from '../panel/controls'
import { CODE_FORMATS, type CodeFormatId } from './codeFormats'
import { CodeViewer } from './CodeViewer'

function FooterButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      {children}
      {label}
    </button>
  )
}

export function CodePanel({ onClose }: { onClose: () => void }) {
  const [formatId, setFormatId] = useState<CodeFormatId>('mermaid')
  const [mermaidIconSet, setMermaidIconSet] = useState<MermaidIconSet>('builtin')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const name = useDiagramStore((s) => s.name)

  const format = CODE_FORMATS.find((f) => f.id === formatId) ?? CODE_FORMATS[0]
  const options = useMemo(() => ({ mermaidIconSet }), [mermaidIconSet])
  const code = useGeneratedCode(format, options)

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = setTimeout(() => setCopyState('idle'), 1600)
    return () => clearTimeout(timer)
  }, [copyState])

  const copy = () =>
    navigator.clipboard.writeText(code).then(
      () => setCopyState('copied'),
      () => setCopyState('failed'),
    )

  const download = () => downloadBlob(new Blob([code], { type: 'text/plain' }), format.fileName(name))

  return (
    <aside aria-label="Export as code" className="flex h-full w-[460px] shrink-0 flex-col border-l border-zinc-200 bg-white">
      <header className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-[13.5px] font-semibold text-zinc-900">Export as code</h2>
        <button
          type="button"
          aria-label="Close code panel"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X size={16} />
        </button>
      </header>

      <div role="tablist" aria-label="Code format" className="flex gap-1 border-b border-zinc-100 px-3 pt-2">
        {CODE_FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={f.id === format.id}
            onClick={() => setFormatId(f.id)}
            className={`-mb-px border-b-2 px-2.5 pb-2 text-[12.5px] transition-colors ${
              f.id === format.id ? 'border-zinc-900 font-medium text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {format.id === 'mermaid' && (
        <div className="border-b border-zinc-100 px-4 py-3">
          <Segmented
            label="Icons"
            value={mermaidIconSet}
            options={[
              { value: 'builtin', label: 'Built-in (works on GitHub)' },
              { value: 'aws', label: 'AWS logos (iconify)' },
            ]}
            onChange={setMermaidIconSet}
          />
          {mermaidIconSet === 'aws' && (
            <p className="mt-2 text-[11.5px] leading-snug text-zinc-500">
              Needs the iconify <code className="font-mono">logos</code> pack registered, e.g. on mermaid.live.
            </p>
          )}
        </div>
      )}

      <CodeViewer code={code} language={format.language} />

      <footer className="flex flex-col gap-2.5 border-t border-zinc-100 px-4 py-3">
        <p className="text-[12px] leading-snug text-zinc-500">{format.note}</p>
        <div className="flex gap-2">
          <FooterButton label={copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'} onClick={copy}>
            {copyState === 'copied' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </FooterButton>
          <FooterButton label="Download" onClick={download}>
            <Download size={14} />
          </FooterButton>
        </div>
      </footer>
    </aside>
  )
}
