import { ReactFlowProvider } from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'
import { useCollaboration } from './collab/useCollaboration'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { DiagramCanvas } from './components/canvas/DiagramCanvas'
import { EmptyState } from './components/canvas/EmptyState'
import { QuickAddPanel } from './components/canvas/QuickAddPanel'
import { ToolHint } from './components/canvas/ToolHint'
import { CodePanel } from './components/code/CodePanel'
import { PageTabs } from './components/pages/PageTabs'
import { PropertiesPanel } from './components/panel/PropertiesPanel'
import { Sidebar } from './components/sidebar/Sidebar'
import { NoticeToast } from './components/toolbar/NoticeToast'
import { Toolbar } from './components/toolbar/Toolbar'
import { useAutosave } from './hooks/useAutosave'
import { useDiagramActions } from './hooks/useDiagramActions'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function Editor() {
  const { actions, notice, dismissNotice } = useDiagramActions()
  const collab = useCollaboration()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const toggleHelp = useCallback(() => setShowShortcuts((v) => !v), [])
  const closeHelp = useCallback(() => setShowShortcuts(false), [])
  const shortcutHandlers = useMemo(
    () => ({ save: actions.save, open: actions.open, tidy: actions.tidy, autoArrange: actions.autoArrange, toggleHelp }),
    [actions, toggleHelp],
  )

  useKeyboardShortcuts(shortcutHandlers)
  useAutosave()

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <DiagramCanvas />
          <EmptyState />
          <Toolbar
            actions={actions}
            collab={collab}
            onShowShortcuts={toggleHelp}
            codeOpen={showCode}
            onToggleCode={() => setShowCode((v) => !v)}
          />
          <ToolHint />
          <PropertiesPanel />
          <QuickAddPanel />
          <NoticeToast notice={notice} onDismiss={dismissNotice} />
        </div>
        <PageTabs />
      </main>
      {showCode && <CodePanel onClose={() => setShowCode(false)} />}
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
