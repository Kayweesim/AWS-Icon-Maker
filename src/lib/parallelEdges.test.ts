import { describe, expect, it } from 'vitest'
import { PARALLEL_EDGE_GAP } from '../layout/config'
import type { AppEdge } from '../types'
import { parallelEdgeOffsets } from './parallelEdges'

const edge = (id: string, source: string, sourceHandle: string, target: string, targetHandle: string): AppEdge => ({
  id,
  type: 'aws',
  source,
  sourceHandle,
  target,
  targetHandle,
  data: { label: '', dashed: false, pathType: 'step', arrows: 'end' },
})

describe('parallelEdgeOffsets', () => {
  it('leaves a single arrow where it is', () => {
    expect(parallelEdgeOffsets([edge('a', 'client', 'right', 'ec2', 'left')]).get('a')).toBe(0)
  })

  it('puts a reverse arrow between the same sides below the first, then alternates', () => {
    const offsets = parallelEdgeOffsets([
      edge('request', 'client', 'right', 'ec2', 'left'),
      edge('reply', 'ec2', 'left', 'client', 'right'),
      edge('async', 'client', 'right', 'ec2', 'left'),
      edge('fourth', 'ec2', 'left', 'client', 'right'),
    ])
    expect([...offsets.values()]).toEqual([0, PARALLEL_EDGE_GAP, -PARALLEL_EDGE_GAP, 2 * PARALLEL_EDGE_GAP])
  })

  it('does not offset arrows that use different sides or nodes', () => {
    const offsets = parallelEdgeOffsets([
      edge('a', 'client', 'right', 'ec2', 'left'),
      edge('b', 'client', 'bottom', 'ec2', 'top'),
      edge('c', 'client', 'right', 'rds', 'left'),
    ])
    expect([...offsets.values()]).toEqual([0, 0, 0])
  })
})
