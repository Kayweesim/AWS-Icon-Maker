import type { DiagramStore } from '../store/diagramStore'
import { EMPTY_PAGE } from './pages'
import { toPage, type Diagram } from './persistence'

/**
 * The whole diagram, every page, without transient UI state. The page this user is on lives on
 * the canvas; the others are parked, so both are read back the same way.
 */
export function wholeDiagram(state: DiagramStore): Diagram {
  return {
    name: state.name,
    pages: state.pages.map((page) => {
      const content = page.id === state.activePageId ? state : (state.parked[page.id] ?? EMPTY_PAGE)
      return toPage({ id: page.id, name: page.name, nodes: content.nodes, edges: content.edges })
    }),
  }
}
