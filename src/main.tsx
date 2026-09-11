import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { loadAutosave } from './lib/persistence'
import { useDiagramStore } from './store/diagramStore'

// Restore the last session before the first render so the canvas can fit it into view.
const saved = loadAutosave()
if (saved) useDiagramStore.getState().loadDiagram(saved)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
