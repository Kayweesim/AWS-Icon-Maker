import type { Snapshot } from './history'
import type { AppEdge, AppNode } from '../types'

/** A page as the tab strip sees it. The contents live either on the canvas or in `parked`. */
export type PageTab = { id: string; name: string }

/** A page this user isn't looking at, kept whole so switching back restores its undo history. */
export type ParkedPage = { nodes: AppNode[]; edges: AppEdge[]; past: Snapshot[]; future: Snapshot[] }

export const EMPTY_PAGE: ParkedPage = { nodes: [], edges: [], past: [], future: [] }

/** "Page 3" — the lowest number not already taken, so deleting and adding doesn't repeat names. */
export function nextPageName(pages: PageTab[]): string {
  const taken = new Set(pages.map((page) => page.name))
  for (let n = 1; n <= pages.length + 1; n++) {
    const name = `Page ${n}`
    if (!taken.has(name)) return name
  }
  return `Page ${pages.length + 1}`
}

/** The page to open after `id` is removed: the one to its right, else the one to its left. */
export function neighbourOf(pages: PageTab[], id: string): PageTab | undefined {
  const index = pages.findIndex((page) => page.id === id)
  if (index === -1) return pages[0]
  return pages[index + 1] ?? pages[index - 1]
}
