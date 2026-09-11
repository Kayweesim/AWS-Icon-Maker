import { exportMermaid, type MermaidIconSet } from '../../exporters/mermaid'
import { toSnakeCase, type ExportInput } from '../../exporters/model'
import { exportPython } from '../../exporters/python'
import { exportTerraform } from '../../exporters/terraform'
import { slugify } from '../../lib/download'
import type { CodeLanguage } from '../../lib/highlight'

export type CodeFormatId = 'mermaid' | 'python' | 'terraform'

export type CodeFormatOptions = { mermaidIconSet: MermaidIconSet }

export type CodeFormat = {
  id: CodeFormatId
  label: string
  language: CodeLanguage
  fileName: (diagramName: string) => string
  /** One line on how to use the output. */
  note: string
  generate: (input: ExportInput, options: CodeFormatOptions) => string
}

export const CODE_FORMATS: CodeFormat[] = [
  {
    id: 'mermaid',
    label: 'Mermaid',
    language: 'mermaid',
    fileName: (name) => `${slugify(name)}.mmd`,
    note: 'Paste into a ```mermaid block in a GitHub README, Notion page or any Markdown file.',
    generate: (input, options) => exportMermaid(input, { iconSet: options.mermaidIconSet }),
  },
  {
    id: 'python',
    label: 'Python',
    language: 'python',
    fileName: (name) => `${toSnakeCase(name) || 'diagram'}.py`,
    note: 'Run after `pip install diagrams` (needs Graphviz) to render a PNG with the official AWS icons.',
    generate: (input) => exportPython(input),
  },
  {
    id: 'terraform',
    label: 'Terraform',
    language: 'terraform',
    fileName: () => 'main.tf',
    note: 'A scaffold, not a working config: replace the placeholders, then run terraform init and plan.',
    generate: (input) => exportTerraform(input),
  },
]
