import { getSmoothStepPath, type Position, type XYPosition } from '@xyflow/react'

export type ElbowEndpoints = {
  sourceX: number; sourceY: number; targetX: number; targetY: number
  sourcePosition: Position; targetPosition: Position
}
type Axis = 'x' | 'y'
export type ElbowHandle = { index: number; axis: Axis; position: XYPosition }

const same = (a: XYPosition, b: XYPosition) => a.x === b.x && a.y === b.y
const midpoint = (a: XYPosition, b: XYPosition): XYPosition => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Recover the orthogonal vertices from React Flow's zero-radius route, not its rounded path.
 * This keeps existing automatic routing (all four handle sides, including backwards edges).
 * At radius zero the Q control/end points coincide, so they reduce to a single vertex. */
function automaticPoints(endpoints: ElbowEndpoints): XYPosition[] {
  const [path] = getSmoothStepPath({ ...endpoints, borderRadius: 0, offset: 20 })
  const numbers = path.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)?.map(Number) ?? []
  const points: XYPosition[] = []
  for (let i = 0; i < numbers.length; i += 2) {
    const point = { x: numbers[i], y: numbers[i + 1] }
    if (points.length && same(points.at(-1)!, point)) continue
    while (points.length > 1) {
      const a = points.at(-2)!, b = points.at(-1)!
      if (!((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y))) break
      points.pop()
    }
    points.push(point)
  }
  // A straight or L-shaped route needs extra (initially collapsed) bends to be draggable
  // without moving the endpoints or changing the side on which it meets either node.
  if (points.length === 2) {
    const [a, b] = points
    const first = { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 }
    const last = { x: a.x + (b.x - a.x) * 2 / 3, y: a.y + (b.y - a.y) * 2 / 3 }
    return [a, first, { ...first }, last, { ...last }, b]
  }
  if (points.length === 3) {
    const [a, corner, b] = points
    const first = midpoint(a, corner)
    return [a, first, { ...first }, corner, b]
  }
  return points
}

/** Small rounded corners, with labels centred on the longest segment. */
function roundedPath(points: XYPosition[]): string {
  let path = `M${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1]
    const before = Math.hypot(b.x - a.x, b.y - a.y)
    const after = Math.hypot(c.x - b.x, c.y - b.y)
    const radius = Math.min(6, before / 2, after / 2)
    if (!radius || (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
      path += `L${b.x} ${b.y}`
    } else {
      const entry = { x: b.x + (a.x - b.x) * radius / before, y: b.y + (a.y - b.y) * radius / before }
      const exit = { x: b.x + (c.x - b.x) * radius / after, y: b.y + (c.y - b.y) * radius / after }
      path += `L${entry.x} ${entry.y}Q${b.x} ${b.y} ${exit.x} ${exit.y}`
    }
  }
  return `${path}L${points.at(-1)!.x} ${points.at(-1)!.y}`
}

export function elbowRoute(endpoints: ElbowEndpoints, savedOffsets?: number[]) {
  const base = automaticPoints(endpoints)
  // Coincident endpoints have no editable segment yet.
  if (base.length < 2) return { points: base, handles: [], offsets: [], path: '', label: base[0] ?? { x: 0, y: 0 } }
  const count = base.length - 3
  // When automatic routing changes topology, old segment indices no longer describe this route.
  const offsets = Array.from({ length: count }, (_, i) => savedOffsets?.length === count ? savedOffsets[i] : 0)
  const axes: Axis[] = []
  for (let i = 0; i < base.length - 1; i++) {
    axes.push(same(base[i], base[i + 1]) ? (axes[i - 1] === 'x' ? 'y' : 'x') : base[i].x === base[i + 1].x ? 'x' : 'y')
  }
  const points = base.map((point) => ({ ...point }))
  // Each interior vertex is the intersection of two perpendicular segment lines.
  for (let i = 1; i < points.length - 1; i++) {
    if (i > 1) points[i][axes[i - 1]] += offsets[i - 2]
    if (i < points.length - 2) points[i][axes[i]] += offsets[i - 1]
  }
  const handles: ElbowHandle[] = []
  let label = midpoint(points[0], points[1]), longest = 0
  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y)
    if (length > longest) { longest = length; label = midpoint(points[i], points[i + 1]) }
    if (i > 0 && i < points.length - 2 && length > 0) {
      handles.push({ index: i - 1, axis: axes[i], position: midpoint(points[i], points[i + 1]) })
    }
  }
  return { points, offsets, handles, path: roundedPath(points), label }
}
