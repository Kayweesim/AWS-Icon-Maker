import { describe, expect, it } from 'vitest'
import { generateRoomCode, normaliseRoomCode, presenceColour, ROOM_CODE_LENGTH, roomCodeFromPath, roomId, roomPath } from './room'

describe('room codes', () => {
  it('generates four unambiguous letters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode()
      expect(code).toHaveLength(ROOM_CODE_LENGTH)
      expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/)
    }
  })

  it('generates codes that round-trip through a URL', () => {
    const code = generateRoomCode()
    expect(roomCodeFromPath(roomPath(code))).toBe(code)
  })

  it('rarely repeats', () => {
    const codes = new Set(Array.from({ length: 500 }, generateRoomCode))
    expect(codes.size).toBeGreaterThan(450)
  })

  it.each([
    ['abcd', 'ABCD'],
    ['  abcd  ', 'ABCD'],
    ['ABCD', 'ABCD'],
    ['https://example.com/ABCD', 'ABCD'],
    ['example.com/abcd', 'ABCD'],
  ])('accepts %s', (input, expected) => {
    expect(normaliseRoomCode(input)).toBe(expected)
  })

  it.each([['ABC'], ['ABCDE'], ['AB1D'], ['ABIO'], [''], ['AB CD']])('rejects %s', (input) => {
    expect(normaliseRoomCode(input)).toBeNull()
  })

  it('reads a code only from a single-segment path', () => {
    expect(roomCodeFromPath('/ABCD')).toBe('ABCD')
    expect(roomCodeFromPath('/abcd')).toBe('ABCD')
    expect(roomCodeFromPath('/')).toBeNull()
    expect(roomCodeFromPath('/ABCD/edit')).toBeNull()
    expect(roomCodeFromPath('/assets/index.js')).toBeNull()
  })

  it('namespaces the Liveblocks room id', () => {
    expect(roomId('ABCD')).toBe('aws-diagram-studio:ABCD')
  })

  it('gives a name the same colour every time', () => {
    expect(presenceColour('Guest 42')).toBe(presenceColour('Guest 42'))
    expect(presenceColour('Guest 42')).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
