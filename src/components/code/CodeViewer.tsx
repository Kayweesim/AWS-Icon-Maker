import { useHighlightedCode } from '../../hooks/useGeneratedCode'
import type { CodeLanguage } from '../../lib/highlight'

export function CodeViewer({ code, language }: { code: string; language: CodeLanguage }) {
  const html = useHighlightedCode(code, language)

  return (
    <div
      aria-label="Generated code"
      data-code={code}
      className="min-h-0 flex-1 overflow-auto bg-zinc-50/60 font-mono text-[12px] leading-[1.6] [&_pre]:min-w-fit [&_pre]:bg-transparent! [&_pre]:px-4 [&_pre]:py-3.5"
    >
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <pre className="text-zinc-700">{code}</pre>}
    </div>
  )
}
