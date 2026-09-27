import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { COLLAB_ENABLED } from './collab/config'
import { roomCodeFromPath } from './collab/room'
import { loadAutosave } from './lib/persistence'
import { useDiagramStore } from './store/diagramStore'

// Restore the last session before the first render so the canvas can fit it into view. Opening a
// room link starts empty instead: that room's diagram is what the person came for.
const joiningARoom = COLLAB_ENABLED && roomCodeFromPath(window.location.pathname) !== null
const saved = joiningARoom ? null : loadAutosave()
if (saved) useDiagramStore.getState().loadDiagram(saved)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
