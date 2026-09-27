import { GROUP_STYLES, type GroupType } from '../data/groups'
import { parseHandle } from '../layout/handles'
import { newId } from './ids'
import { DEFAULT_EDGE_DATA } from '../store/diagramStore'
import type { AppEdge, AppNode, AwsEdgeData, DiagramPage, EdgeArrows, EdgePathType } from '../types'

const APP_ID = 'aws-diagram-studio'
/** 2 added pages. Version 1 files (a bare nodes/edges pair) still open, as a single page. */
const FILE_VERSION = 2
const AUTOSAVE_KEY = `${APP_ID}:autosave`

export type Diagram = { name: string; pages: Page[] }

export type DiagramFile = Diagram & { app: typeof APP_ID; version: number }

export type Page = DiagramPage

export const DEFAULT_PAGE_NAME = 'Page 1'

export const newPage = (name = DEFAULT_PAGE_NAME, content?: Omit<Page, 'id' | 'name'>): Page => ({
  id: newId('p'),
  name,
  nodes: content?.nodes ?? [],
  edges: content?.edges ?? [],
})

/** Strips transient UI state (selection, drag, measurements) from a page. */
export function toPage({ id, name, nodes, edges }: Page): Page {
  return {
    id,
    name,
    nodes: nodes.map(({ id: nodeId, type, position, data, parentId, width, height }) => ({
      id: nodeId,
      type,
      position,
      data,
      ...(parentId && { parentId }),
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
    })) as AppNode[],
    edges: edges.map(({ id: edgeId, type, source, target, sourceHandle, targetHandle, data }) => ({
      id: edgeId,
      type,
      source,
      target,
      sourceHandle,
      targetHandle,
      data,
    })),
  }
}

export function toFile({ name, pages }: Diagram): DiagramFile {
  return { app: APP_ID, version: FILE_VERSION, name, pages: pages.map(toPage) }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

// Icons must come from the bundled AWS package, never arbitrary URLs.
const ICON_PATH = /^\/aws-icons\/[\w./&+-]+\.svg$/

const PATH_TYPES: EdgePathType[] = ['step', 'straight', 'bezier']
const ARROWS: EdgeArrows[] = ['end', 'both', 'none']

function parseNode(raw: unknown, index: number): AppNode {
  const where = `Node ${index + 1}`
  if (!isObject(raw) || typeof raw.id !== 'string' || !raw.id) throw new Error(`${where} has no id`)
  if (!isObject(raw.position) || !isNumber(raw.position.x) || !isNumber(raw.position.y)) {
    throw new Error(`${where} has an invalid position`)
  }
  const data = isObject(raw.data) ? raw.data : {}
  const base = {
    id: raw.id,
    position: { x: raw.position.x, y: raw.position.y },
    ...(typeof raw.parentId === 'string' && { parentId: raw.parentId }),
  }

  if (raw.type === 'icon') {
    const iconPath = str(data.iconPath)
    if (!ICON_PATH.test(iconPath)) throw new Error(`${where} references an unknown icon`)
    const iconSize = isNumber(data.iconSize) && data.iconSize >= 16 && data.iconSize <= 256 ? Math.round(data.iconSize) : undefined
    return {
      ...base,
      type: 'icon',
      data: { label: str(data.label), iconPath, iconId: str(data.iconId), ...(iconSize && { iconSize }) },
    }
  }

  if (raw.type === 'awsGroup') {
    const groupType = (str(data.groupType) in GROUP_STYLES ? data.groupType : 'generic') as GroupType
    const style = GROUP_STYLES[groupType]
    return {
      ...base,
      type: 'awsGroup',
      width: isNumber(raw.width) ? Math.max(raw.width, 40) : style.width,
      height: isNumber(raw.height) ? Math.max(raw.height, 40) : style.height,
      data: { label: str(data.label, style.label), groupType },
    }
  }

  if (raw.type === 'text') {
    const fontSize = isNumber(data.fontSize) && data.fontSize >= 8 && data.fontSize <= 72 ? Math.round(data.fontSize) : undefined
    return { ...base, type: 'text', data: { label: str(data.label), ...(fontSize && { fontSize }) } }
  }

  throw new Error(`${where} has an unsupported type`)
}

function parseEdge(raw: unknown, nodeIds: Set<string>): AppEdge | null {
  if (!isObject(raw) || typeof raw.source !== 'string' || typeof raw.target !== 'string') return null
  if (!nodeIds.has(raw.source) || !nodeIds.has(raw.target)) return null
  const data = isObject(raw.data) ? raw.data : {}
  const handle = (value: unknown) => (typeof value === 'string' && parseHandle(value) ? value : null)
  const edgeData: AwsEdgeData = {
    ...DEFAULT_EDGE_DATA,
    label: str(data.label),
    dashed: data.dashed === true,
    pathType: PATH_TYPES.includes(data.pathType as EdgePathType) ? (data.pathType as EdgePathType) : 'step',
    arrows: ARROWS.includes(data.arrows as EdgeArrows) ? (data.arrows as EdgeArrows) : 'end',
  }
  return {
    id: str(raw.id) || `e_${raw.source}_${raw.target}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'aws',
    source: raw.source,
    target: raw.target,
    sourceHandle: handle(raw.sourceHandle),
    targetHandle: handle(raw.targetHandle),
    data: edgeData,
  }
}

/** Validates one untrusted page and returns clean, self-consistent nodes and edges. */
function parsePage(input: Record<string, unknown>, fallbackName: string): Page {
  if (!Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    throw new Error('The file is missing nodes or edges')
  }

  const parsed = input.nodes.map(parseNode)
  if (new Set(parsed.map((n) => n.id)).size !== parsed.length) throw new Error('The file contains duplicate node ids')
  // Text boxes with no text are invisible; drop them.
  const nodes = parsed.filter((n) => n.type !== 'text' || n.data.label.trim())
  const ids = new Set(nodes.map((n) => n.id))

  // Drop references to parents that don't exist or aren't groups, so React Flow doesn't throw.
  const groupIds = new Set(nodes.filter((n) => n.type === 'awsGroup').map((n) => n.id))
  const cleanNodes = nodes.map((n) =>
    n.parentId && (!groupIds.has(n.parentId) || n.parentId === n.id) ? { ...n, parentId: undefined } : n,
  )

  const edges = input.edges.map((e) => parseEdge(e, ids)).filter((e): e is AppEdge => e !== null)

  return {
    id: typeof input.id === 'string' && input.id ? input.id : newId('p'),
    name: str(input.name, fallbackName) || fallbackName,
    nodes: cleanNodes,
    edges,
  }
}

/** Validates untrusted JSON (a user's file, localStorage or a room) and returns a clean diagram. */
export function parseDiagram(input: unknown): Diagram {
  if (!isObject(input)) throw new Error('This is not a diagram file')
  const name = str(input.name, 'Untitled diagram') || 'Untitled diagram'

  // A version 1 file has no pages: its nodes and edges become the first page.
  const raw = Array.isArray(input.pages) ? input.pages : [input]
  if (raw.length === 0) throw new Error('The file has no pages')

  const seen = new Set<string>()
  const pages = raw.map((page, index) => {
    if (!isObject(page)) throw new Error(`Page ${index + 1} is not readable`)
    const parsed = parsePage(page, `Page ${index + 1}`)
    // Duplicate ids would make two tabs impossible to tell apart.
    const id = seen.has(parsed.id) ? newId('p') : parsed.id
    seen.add(id)
    return { ...parsed, id }
  })

  return { name, pages }
}

export function saveAutosave(diagram: Diagram) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(toFile(diagram)))
  } catch {
    // Storage may be full or unavailable (private mode); autosave is best-effort.
  }
}

export function loadAutosave(): Diagram | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    return raw ? parseDiagram(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
