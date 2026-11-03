import { parseDiagram, toFile, type Diagram } from './persistence'

const VERSIONS_KEY = 'aws-diagram-studio:versions'
export const MAX_VERSIONS = 20
/** While someone keeps editing, a version is kept at most this often. */
export const AUTO_VERSION_INTERVAL_MS = 5 * 60 * 1000

/** Why a version was kept, shown in the history menu. */
export type VersionReason = 'auto' | 'delete-page' | 'new-diagram' | 'restore' | 'open'

export type Version = { id: string; savedAt: number; reason: VersionReason; diagram: Diagram }

type StoredVersion = { id: string; savedAt: number; reason: VersionReason; file: unknown }

const REASONS: VersionReason[] = ['auto', 'delete-page', 'new-diagram', 'restore', 'open']

function readStored(): StoredVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (v): v is StoredVersion =>
        typeof v === 'object' && v !== null && typeof v.id === 'string' && typeof v.savedAt === 'number' && REASONS.includes(v.reason),
    )
  } catch {
    return []
  }
}

/** Writes the list, dropping the oldest versions until it fits in storage. Returns false if nothing fit. */
function writeStored(versions: StoredVersion[]): boolean {
  let kept = versions.slice(-MAX_VERSIONS)
  while (kept.length > 0) {
    try {
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(kept))
      return true
    } catch {
      kept = kept.slice(1)
    }
  }
  try {
    localStorage.removeItem(VERSIONS_KEY)
  } catch {
    // Storage unavailable; versions are best-effort.
  }
  return false
}

const isEmpty = (diagram: Diagram) => diagram.pages.every((page) => page.nodes.length === 0)

/**
 * Keeps a copy of the diagram as a version. Empty diagrams and exact repeats of the newest
 * version are skipped, so restoring or saving twice doesn't fill the list with duplicates.
 */
export function recordVersion(diagram: Diagram, reason: VersionReason, now = Date.now()): void {
  if (isEmpty(diagram)) return
  const file = toFile(diagram)
  const stored = readStored()
  const latest = stored.at(-1)
  if (latest && JSON.stringify(latest.file) === JSON.stringify(file)) return
  writeStored([...stored, { id: `v${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, savedAt: now, reason, file }])
}

/** When the newest version was kept, or 0 if there is none. */
export function latestVersionTime(): number {
  return readStored().at(-1)?.savedAt ?? 0
}

/** Every readable version, newest first. */
export function listVersions(): Version[] {
  const versions: Version[] = []
  for (const stored of readStored()) {
    try {
      versions.push({ id: stored.id, savedAt: stored.savedAt, reason: stored.reason, diagram: parseDiagram(stored.file) })
    } catch {
      // A version that no longer parses is skipped rather than breaking the list.
    }
  }
  return versions.reverse()
}

/** Frees room for the autosave, which matters more than old versions. Returns false once none are left. */
export function dropOldestVersion(): boolean {
  const stored = readStored()
  if (stored.length === 0) return false
  if (stored.length === 1) {
    try {
      localStorage.removeItem(VERSIONS_KEY)
    } catch {
      return false
    }
    return true
  }
  return writeStored(stored.slice(1))
}
