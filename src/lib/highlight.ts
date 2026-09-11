import type { HighlighterCore } from 'shiki/core'

export type CodeLanguage = 'mermaid' | 'python' | 'terraform'

let highlighter: Promise<HighlighterCore> | null = null

/** Loads Shiki with only the grammars the code panel needs, on first use. */
function loadHighlighter() {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ])
    return createHighlighterCore({
      themes: [import('@shikijs/themes/github-light')],
      langs: [import('@shikijs/langs/mermaid'), import('@shikijs/langs/python'), import('@shikijs/langs/terraform')],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  return highlighter
}

/** Syntax-highlighted HTML. Shiki escapes the code, so the result is safe to inject. */
export async function highlight(code: string, language: CodeLanguage): Promise<string> {
  return (await loadHighlighter()).codeToHtml(code, { lang: language, theme: 'github-light' })
}
