import { describe, expect, it } from 'vitest'
import { handleId, handlePercents, parseHandle } from './handles'

describe('connection points', () => {
  it('gives small nodes one point per side and larger ones more, always with a middle', () => {
    expect(handlePercents(64)).toEqual([50])
    expect(handlePercents(240)).toEqual([50])
    expect(handlePercents(480)).toEqual([25, 50, 75])
    expect(handlePercents(760)).toEqual([16.7, 33.3, 50, 66.7, 83.3])
    expect(handlePercents(4000)).toHaveLength(9)
    for (const length of [0, 100, 480, 900, 2000]) expect(handlePercents(length)).toContain(50)
  })

  it('names the middle point after its side, so older diagrams keep working', () => {
    expect(handleId('right', 50)).toBe('right')
    expect(handleId('right', 25)).toBe('right-25')
    expect(parseHandle('right')).toEqual({ side: 'right', fraction: 0.5 })
    expect(parseHandle('right-25')).toEqual({ side: 'right', fraction: 0.25 })
    expect(parseHandle('top-16.7')).toEqual({ side: 'top', fraction: 0.167 })
  })

  it('rejects anything that is not a handle', () => {
    for (const id of [null, undefined, '', 'middle', 'right-', 'right-abc', 'rightish', '<script>']) {
      expect(parseHandle(id), String(id)).toBeNull()
    }
  })
})
