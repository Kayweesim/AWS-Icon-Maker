import { Position } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { elbowRoute, type ElbowEndpoints } from './elbowRoute'

const endpoints: ElbowEndpoints = { sourceX: 0, sourceY: 0, targetX: 300, targetY: 200, sourcePosition: Position.Right, targetPosition: Position.Left }
const positions = Object.values(Position)

describe('editable elbow routes', () => {
  for (const sourcePosition of positions) for (const targetPosition of positions) {
    it(`keeps ${sourcePosition} → ${targetPosition} orthogonal with fixed endpoints`, () => {
      const params = { ...endpoints, sourcePosition, targetPosition }
      const initial = elbowRoute(params)
      expect(initial.handles.length).toBeGreaterThan(0)
      const edited = elbowRoute(params, initial.offsets.map((_, index) => 30 + index * 10))
      expect(edited.points[0]).toEqual({ x: 0, y: 0 })
      expect(edited.points.at(-1)).toEqual({ x: 300, y: 200 })
      for (let i = 1; i < edited.points.length; i++) {
        const a = edited.points[i - 1], b = edited.points[i]
        expect(a.x === b.x || a.y === b.y).toBe(true)
      }
      expect(edited.path).not.toContain('NaN')
    })
  }

  it('moves the central vertical segment sideways', () => {
    const initial = elbowRoute(endpoints)
    const edited = elbowRoute(endpoints, [60])
    expect(edited.handles[0].position.x).toBe(initial.handles[0].position.x + 60)
    expect(edited.handles[0].position.y).toBe(initial.handles[0].position.y)
  })

  it.each([Position.Top, Position.Bottom])('makes a draggable U-shaped route on the %s of aligned nodes', (side) => {
    const sign = side === Position.Top ? -1 : 1
    const params = { ...endpoints, targetY: 0, sourcePosition: side, targetPosition: side }
    const route = elbowRoute(params, [sign * 60])
    expect(route.points).toEqual([
      { x: 0, y: 0 }, { x: 0, y: sign * 80 }, { x: 300, y: sign * 80 }, { x: 300, y: 0 },
    ])
    expect(route.handles).toEqual([{ index: 0, axis: 'y', position: { x: 150, y: sign * 80 } }])
    const moved = elbowRoute(params, [sign * 100])
    expect(moved.points[1].y).toBe(sign * 120)
    expect(moved.points[0]).toEqual(route.points[0])
    expect(moved.points.at(-1)).toEqual(route.points.at(-1))
  })

  it('can introduce a dogleg between horizontally aligned nodes', () => {
    const params = { ...endpoints, targetY: 0 }
    const initial = elbowRoute(params)
    expect(initial.handles).toHaveLength(1)
    const handle = initial.handles[0]
    expect(handle.axis).toBe('y')
    const offsets = [...initial.offsets]
    offsets[handle.index] = 80
    const edited = elbowRoute(params, offsets)
    expect(edited.points.some((point) => point.y === 80)).toBe(true)
    expect(edited.handles).toHaveLength(3)
  })

  it('moves with a translated/duplicated diagram without changing offsets', () => {
    const original = elbowRoute(endpoints, [42])
    const moved = elbowRoute({ ...endpoints, sourceX: 24, sourceY: 24, targetX: 324, targetY: 224 }, [42])
    expect(moved.points).toEqual(original.points.map(({ x, y }) => ({ x: x + 24, y: y + 24 })))
  })

  it('ignores stale offsets when automatic routing changes topology', () => {
    expect(elbowRoute(endpoints, [10, 20, 30]).points).toEqual(elbowRoute(endpoints).points)
  })

  it('handles overlapping nodes and backwards connections without invalid coordinates', () => {
    for (const sourcePosition of positions) for (const targetPosition of positions) {
      for (const targetX of [-300, -10, 0, 10]) {
        const route = elbowRoute({ ...endpoints, targetX, targetY: 0, sourcePosition, targetPosition })
        expect(route.path).not.toMatch(/NaN|Infinity/)
        for (const point of route.points) expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
      }
    }
  })
})
