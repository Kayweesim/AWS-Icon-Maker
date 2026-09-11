import { LEGACY_ICON_SIZE } from '../layout/config'
import type { AppNode } from '../types'

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/** Nodes part-way between two layouts of the same diagram. */
export function interpolateNodes(from: AppNode[], to: AppNode[], t: number): AppNode[] {
  const start = new Map(from.map((n) => [n.id, n]))
  return to.map((target) => {
    const origin = start.get(target.id)
    if (!origin || origin === target) return target
    const node = {
      ...target,
      position: { x: lerp(origin.position.x, target.position.x, t), y: lerp(origin.position.y, target.position.y, t) },
    } as AppNode
    if (node.type === 'awsGroup' && origin.type === 'awsGroup') {
      if (origin.width !== undefined && node.width !== undefined) node.width = lerp(origin.width, node.width, t)
      if (origin.height !== undefined && node.height !== undefined) node.height = lerp(origin.height, node.height, t)
    }
    if (node.type === 'icon' && origin.type === 'icon') {
      const a = origin.data.iconSize ?? LEGACY_ICON_SIZE
      const b = node.data.iconSize ?? LEGACY_ICON_SIZE
      if (a !== b) node.data = { ...node.data, iconSize: Math.round(lerp(a, b, t)) }
    }
    return node
  })
}

const canAnimate = () =>
  typeof window !== 'undefined' &&
  typeof window.requestAnimationFrame === 'function' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Calls `onFrame` with eased progress each animation frame, then `onDone`. Returns a
 * `finish` function that jumps straight to the end. Completes immediately when animation
 * isn't available (tests, reduced motion).
 */
export function animate(durationMs: number, onFrame: (t: number) => void, onDone: () => void): () => void {
  let done = false
  let frame = 0
  const finish = () => {
    if (done) return
    done = true
    if (frame) window.cancelAnimationFrame(frame)
    onDone()
  }
  if (durationMs <= 0 || !canAnimate()) {
    finish()
    return finish
  }
  const start = performance.now()
  const tick = (now: number) => {
    if (done) return
    const t = Math.min(1, (now - start) / durationMs)
    if (t >= 1) return finish()
    onFrame(easeOutCubic(t))
    frame = window.requestAnimationFrame(tick)
  }
  frame = window.requestAnimationFrame(tick)
  return finish
}
