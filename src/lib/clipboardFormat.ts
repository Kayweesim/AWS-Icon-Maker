import type { ClipboardData } from './clipboard'
import { newId } from './ids'
import { parseDiagram, toPage } from './persistence'

export const CLIPBOARD_MIME = 'application/x-aws-diagram-selection+json'
export const CLIPBOARD_PREFIX = 'AWS Diagram Studio selection\n'

/** Portable selection, not a reference to a tab's in-memory clipboard. */
export function serializeClipboard(selection: ClipboardData): string {
  const { nodes, edges } = toPage({ ...selection, id: 'clipboard', name: 'Selection' })
  return JSON.stringify({ app: 'aws-diagram-studio', kind: 'selection', version: 1, copyId: newId('copy'), nodes, edges })
}

export function clipboardText(transfer: Pick<DataTransfer, 'getData'>): string | null {
  const custom = transfer.getData(CLIPBOARD_MIME)
  if (custom) return custom
  const text = transfer.getData('text/plain')
  // Some OS clipboard bridges convert LF into CRLF.
  const prefix = text.startsWith(CLIPBOARD_PREFIX) ? CLIPBOARD_PREFIX : CLIPBOARD_PREFIX.replace('\n', '\r\n')
  return text.startsWith(prefix) ? text.slice(prefix.length) : null
}

/** Clipboard contents are untrusted, just like an imported JSON file. */
export function parseClipboard(text: string): ClipboardData {
  const raw: unknown = JSON.parse(text)
  if (!raw || typeof raw !== 'object' || !('app' in raw) || raw.app !== 'aws-diagram-studio' ||
    !('kind' in raw) || raw.kind !== 'selection' || !('version' in raw) || raw.version !== 1 ||
    !('nodes' in raw) || !('edges' in raw)) throw new Error('Unrecognised diagram clipboard format')
  const { nodes, edges } = parseDiagram({ nodes: raw.nodes, edges: raw.edges }).pages[0]
  if (!nodes.length) throw new Error('The copied selection is empty')
  // A cyclic group hierarchy would hang geometry/parent traversal during paste.
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const node of nodes) {
    const seen = new Set([node.id])
    let parentId = node.parentId
    while (parentId) {
      if (seen.has(parentId)) throw new Error('The copied selection contains cyclic groups')
      seen.add(parentId)
      parentId = byId.get(parentId)?.parentId
    }
  }
  return { nodes, edges }
}
