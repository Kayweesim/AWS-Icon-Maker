// Normalised, fault-tolerant view of the diagram shared by all code exporters.
import { codeMappingFor, type CodeMapping } from '../data/codeMappings'
import { GROUP_STYLES, groupStyle, type GroupType } from '../data/groups'
import { layoutSize } from '../layout/sizes'
import type { AppEdge, AppNode, EdgeArrows, GroupNode, IconNode, TextNode } from '../types'

export type ExportInput = {
  name: string
  nodes: IconNode[]
  groups: GroupNode[]
  edges: AppEdge[]
  /** Free text on the canvas, exported as comments. */
  notes?: TextNode[]
}

export type ModelNode = {
  id: string
  kind: 'icon' | 'group'
  /** The label drawn on the canvas, or the service/group name if it's empty. */
  label: string
  /** Canonical AWS name, used in comments. */
  serviceName: string
  parentId?: string
  /** Absolute bounding box. */
  x: number
  y: number
  width: number
  height: number
  iconId?: string
  groupType?: GroupType
  mapping?: CodeMapping
}

export type ModelNote = {
  id: string
  label: string
  /** Label of the group the note sits in, if any. */
  parentLabel?: string
}

export type ModelEdge = {
  id: string
  source: string
  target: string
  label: string
  dashed: boolean
  arrows: EdgeArrows
}

export type DiagramModel = {
  name: string
  nodes: Map<string, ModelNode>
  roots: ModelNode[]
  childrenOf: Map<string, ModelNode[]>
  edges: ModelEdge[]
  notes: ModelNote[]
  noteIds: Set<string>
}

export function toExportInput(name: string, nodes: AppNode[], edges: AppEdge[]): ExportInput {
  return {
    name,
    nodes: nodes.filter((n): n is IconNode => n.type === 'icon'),
    groups: nodes.filter((n): n is GroupNode => n.type === 'awsGroup'),
    edges,
    notes: nodes.filter((n): n is TextNode => n.type === 'text'),
  }
}

const oneLine = (text: unknown) => (typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '')
const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

function nameFromIconId(iconId: unknown) {
  if (typeof iconId !== 'string') return 'Unknown service'
  return iconId.replace(/^(svc|res):[^/]*\//, '').replace(/[-_]+/g, ' ').trim() || 'Unknown service'
}

// Rows of roughly 48px, then left to right, so output follows how the diagram reads.
const readingOrder = <T extends { x: number; y: number; id: string }>(a: T, b: T) =>
  Math.round(a.y / 48) - Math.round(b.y / 48) || a.x - b.x || a.id.localeCompare(b.id)

export function buildModel(input: ExportInput): DiagramModel {
  const raw = new Map<string, IconNode | GroupNode>()
  for (const node of [...(input.groups ?? []), ...(input.nodes ?? [])]) {
    if (node && typeof node.id === 'string' && !raw.has(node.id)) raw.set(node.id, node)
  }

  const declaredParent = (id: string) => {
    const parentId = raw.get(id)?.parentId
    return parentId && raw.get(parentId)?.type === 'awsGroup' ? parentId : undefined
  }
  // Parents must exist, be groups, and not form a cycle.
  const parentOf = new Map<string, string | undefined>()
  for (const id of raw.keys()) {
    const seen = new Set([id])
    let valid = true
    for (let cursor = declaredParent(id); cursor; cursor = declaredParent(cursor)) {
      if (seen.has(cursor)) {
        valid = false
        break
      }
      seen.add(cursor)
    }
    parentOf.set(id, valid ? declaredParent(id) : undefined)
  }

  const absolute = (id: string) => {
    let x = 0
    let y = 0
    for (let cursor: string | undefined = id; cursor; cursor = parentOf.get(cursor)) {
      x += finite(raw.get(cursor)?.position?.x)
      y += finite(raw.get(cursor)?.position?.y)
    }
    return { x, y }
  }

  const nodes = new Map<string, ModelNode>()
  for (const [id, node] of raw) {
    const base = { id, parentId: parentOf.get(id), ...absolute(id), ...layoutSize(node) }
    if (node.type === 'awsGroup') {
      const type = node.data?.groupType
      const groupType: GroupType = typeof type === 'string' && type in GROUP_STYLES ? type : 'generic'
      const style = groupStyle(groupType)
      nodes.set(id, { ...base, kind: 'group', label: oneLine(node.data?.label) || style.label, serviceName: style.label, groupType })
    } else {
      const mapping = codeMappingFor(node.data?.iconId)
      const serviceName = mapping?.label ?? nameFromIconId(node.data?.iconId)
      nodes.set(id, {
        ...base,
        kind: 'icon',
        label: oneLine(node.data?.label) || serviceName,
        serviceName,
        iconId: node.data?.iconId,
        mapping,
      })
    }
  }

  const childrenOf = new Map<string, ModelNode[]>()
  const roots: ModelNode[] = []
  for (const node of nodes.values()) {
    if (node.parentId) childrenOf.set(node.parentId, [...(childrenOf.get(node.parentId) ?? []), node])
    else roots.push(node)
  }
  roots.sort(readingOrder)
  childrenOf.forEach((children) => children.sort(readingOrder))

  const edges: ModelEdge[] = []
  for (const edge of input.edges ?? []) {
    if (!edge || typeof edge.source !== 'string' || typeof edge.target !== 'string') continue
    const arrows = edge.data?.arrows
    edges.push({
      id: String(edge.id),
      source: edge.source,
      target: edge.target,
      label: oneLine(edge.data?.label),
      dashed: edge.data?.dashed === true,
      arrows: arrows === 'both' || arrows === 'none' ? arrows : 'end',
    })
  }

  const noteIds = new Set<string>()
  const placedNotes: (ModelNote & { x: number; y: number })[] = []
  for (const note of input.notes ?? []) {
    if (!note || typeof note.id !== 'string') continue
    noteIds.add(note.id)
    const label = oneLine(note.data?.label)
    if (!label) continue
    const parent = note.parentId ? nodes.get(note.parentId) : undefined
    placedNotes.push({
      id: note.id,
      label,
      ...(parent?.kind === 'group' && { parentLabel: parent.label }),
      x: (parent?.x ?? 0) + finite(note.position?.x),
      y: (parent?.y ?? 0) + finite(note.position?.y),
    })
  }
  const notes = placedNotes.sort(readingOrder).map(({ id, label, parentLabel }) => ({ id, label, ...(parentLabel && { parentLabel }) }))

  return { name: oneLine(input.name) || 'Untitled diagram', nodes, roots, childrenOf, edges, notes, noteIds }
}

/** Visits the node tree depth-first in reading order. */
export function walkTree(
  model: DiagramModel,
  visit: { enter: (node: ModelNode, depth: number) => void; exit?: (node: ModelNode, depth: number) => void },
) {
  const walk = (node: ModelNode, depth: number) => {
    visit.enter(node, depth)
    for (const child of model.childrenOf.get(node.id) ?? []) walk(child, depth + 1)
    visit.exit?.(node, depth)
  }
  model.roots.forEach((root) => walk(root, 0))
}

export function isAncestor(model: DiagramModel, ancestorId: string, id: string): boolean {
  for (let cursor = model.nodes.get(id)?.parentId; cursor; cursor = model.nodes.get(cursor)?.parentId) {
    if (cursor === ancestorId) return true
  }
  return false
}

export type Endpoint = { node: ModelNode; viaGroup?: ModelNode }

/**
 * The service an edge end attaches to. Most formats can't connect to a group itself, so a
 * group resolves to its first service (in reading order). Null if missing or empty.
 */
export function resolveEndpoint(model: DiagramModel, id: string): Endpoint | null {
  const node = model.nodes.get(id)
  if (!node) return null
  if (node.kind === 'icon') return { node }
  const firstIcon = (groupId: string): ModelNode | undefined => {
    for (const child of model.childrenOf.get(groupId) ?? []) {
      const found = child.kind === 'icon' ? child : firstIcon(child.id)
      if (found) return found
    }
    return undefined
  }
  const icon = firstIcon(id)
  return icon ? { node: icon, viaGroup: node } : null
}

export type ResolvedEdge = { edge: ModelEdge; source: Endpoint; target: Endpoint }
export type SkippedEdge = { edge: ModelEdge; reason: string }

/** Splits edges into those every format can draw and those it has to leave as comments. */
export function resolveEdges(model: DiagramModel): { resolved: ResolvedEdge[]; skipped: SkippedEdge[] } {
  const resolved: ResolvedEdge[] = []
  const skipped: SkippedEdge[] = []
  for (const edge of model.edges) {
    const source = resolveEndpoint(model, edge.source)
    const target = resolveEndpoint(model, edge.target)
    if (model.noteIds.has(edge.source) || model.noteIds.has(edge.target)) {
      skipped.push({ edge, reason: 'it connects to a text note' })
    } else if (!model.nodes.has(edge.source) || !model.nodes.has(edge.target)) {
      skipped.push({ edge, reason: 'one end is missing' })
    } else if (!source || !target) {
      skipped.push({ edge, reason: 'it connects to a group with no services' })
    } else if (
      source.node.id === target.node.id ||
      isAncestor(model, edge.source, edge.target) ||
      isAncestor(model, edge.target, edge.source)
    ) {
      skipped.push({ edge, reason: 'it connects a group to its own contents' })
    } else {
      resolved.push({ edge, source, target })
    }
  }
  return { resolved, skipped }
}

export function toSnakeCase(text: string): string {
  const snake = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return /^[0-9]/.test(snake) ? `n_${snake}` : snake
}

/** Unique snake_case identifiers for every node, derived from labels, in tree order. */
export function makeIdentifiers(model: DiagramModel, reserved: ReadonlySet<string> = new Set()): Map<string, string> {
  const ids = new Map<string, string>()
  const used = new Set<string>()
  walkTree(model, {
    enter: (node) => {
      const base = toSnakeCase(node.label) || (node.kind === 'group' ? 'group' : 'service')
      let candidate = base
      for (let n = 2; used.has(candidate) || reserved.has(candidate); n++) candidate = `${base}_${n}`
      used.add(candidate)
      ids.set(node.id, candidate)
    },
  })
  return ids
}

export const centreOf = (node: ModelNode) => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 })
