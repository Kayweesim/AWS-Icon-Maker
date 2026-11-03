import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newPage, saveAutosave, type Diagram } from './persistence'
import { dropOldestVersion, latestVersionTime, listVersions, MAX_VERSIONS, recordVersion } from './versions'
import type { AppNode } from '../types'

/** An in-memory localStorage that refuses writes beyond `quota` characters in total. */
function fakeStorage(quota = Infinity) {
  const items = new Map<string, string>()
  const used = () => [...items.values()].reduce((sum, value) => sum + value.length, 0)
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (used() - (items.get(key)?.length ?? 0) + value.length > quota) throw new Error('QuotaExceededError')
      items.set(key, value)
    },
    removeItem: (key: string) => void items.delete(key),
    items,
  }
}

const icon = (id: string): AppNode =>
  ({ id, type: 'icon', position: { x: 0, y: 0 }, data: { label: id, iconId: id, iconPath: `/aws-icons/x/${id}.svg` } }) as AppNode

const diagram = (...ids: string[]): Diagram => ({ name: 'D', pages: [newPage('Page 1', { nodes: ids.map(icon), edges: [] })] })

let storage: ReturnType<typeof fakeStorage>

beforeEach(() => {
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
})
afterEach(() => vi.unstubAllGlobals())

describe('versions', () => {
  it('keeps versions newest first and reads them back', () => {
    recordVersion(diagram('a'), 'auto', 1000)
    recordVersion(diagram('a', 'b'), 'delete-page', 2000)

    const versions = listVersions()
    expect(versions.map((v) => v.reason)).toEqual(['delete-page', 'auto'])
    expect(versions[0].diagram.pages[0].nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(latestVersionTime()).toBe(2000)
  })

  it('skips empty diagrams and repeats of the newest version', () => {
    recordVersion(diagram(), 'auto')
    const same = diagram('a')
    recordVersion(same, 'auto')
    recordVersion(same, 'restore')
    expect(listVersions()).toHaveLength(1)
  })

  it(`keeps only the last ${MAX_VERSIONS}`, () => {
    for (let i = 0; i < MAX_VERSIONS + 5; i++) recordVersion(diagram(`n${i}`), 'auto', i)
    const versions = listVersions()
    expect(versions).toHaveLength(MAX_VERSIONS)
    expect(versions.at(-1)!.savedAt).toBe(5)
  })

  it('drops the oldest versions when storage is full', () => {
    recordVersion(diagram('a'), 'auto', 1)
    const oneVersion = storage.items.get('aws-diagram-studio:versions')!.length
    vi.stubGlobal('localStorage', (storage = fakeStorage(oneVersion * 2.5)))
    for (let i = 0; i < 5; i++) recordVersion(diagram(`n${i}`), 'auto', i)
    const versions = listVersions()
    expect(versions.length).toBeGreaterThan(0)
    expect(versions.length).toBeLessThan(5)
    expect(versions[0].savedAt).toBe(4)
  })

  it('gives way to the autosave when storage is full', () => {
    for (let i = 0; i < 5; i++) recordVersion(diagram(`n${i}`), 'auto', i)
    const total = [...storage.items.values()].reduce((sum, v) => sum + v.length, 0)
    const full = fakeStorage(total)
    for (const [key, value] of storage.items) full.items.set(key, value)
    vi.stubGlobal('localStorage', full)

    saveAutosave(diagram('x', 'y', 'z'), dropOldestVersion)
    expect(full.items.has('aws-diagram-studio:autosave')).toBe(true)
  })

  it('ignores unreadable storage', () => {
    storage.items.set('aws-diagram-studio:versions', '{not json')
    expect(listVersions()).toEqual([])
    recordVersion(diagram('a'), 'auto')
    expect(listVersions()).toHaveLength(1)
  })
})
