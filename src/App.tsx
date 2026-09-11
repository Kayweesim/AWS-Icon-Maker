import { ReactFlowProvider } from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { DiagramCanvas } from './components/canvas/DiagramCanvas'
import { EmptyState } from './components/canvas/EmptyState'
import { PropertiesPanel } from './components/panel/PropertiesPanel'
import { Sidebar } from './components/sidebar/Sidebar'
import { NoticeToast } from './components/toolbar/NoticeToast'
import { Toolbar } from './components/toolbar/Toolbar'
import { useAutosave } from './hooks/useAutosave'
import { useDiagramActions } from './hooks/useDiagramActions'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function Editor() {
  const { actions, notice, dismissNotice } = useDiagramActions()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const toggleHelp = useCallback(() => setShowShortcuts((v) => !v), [])
  const closeHelp = useCallback(() => setShowShortcuts(false), [])
  const shortcutHandlers = useMemo(() => ({ save: actions.save, open: actions.open, toggleHelp }), [actions, toggleHelp])

  useKeyboardShortcuts(shortcutHandlers)
  useAutosave()

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <main className="relative min-w-0 flex-1">
        <DiagramCanvas />
        <EmptyState />
        <Toolbar actions={actions} onShowShortcuts={toggleHelp} />
        <PropertiesPanel />
        <NoticeToast notice={notice} onDismiss={dismissNotice} />
      </main>
      <ShortcutsDialog open={showShortcuts} onClose={closeHelp} />
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  )
}
