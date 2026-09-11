import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

type Props = {
  value: string
  editing: boolean
  onCommit: (value: string) => void
  onDone: () => void
  className?: string
  style?: CSSProperties
  placeholder?: string
}

/**
 * Text that turns into an auto-growing textarea while editing.
 * Enter commits, Shift+Enter inserts a line break, Escape cancels. The draft is also
 * committed whenever editing ends some other way (blur, clicking the canvas).
 */
export function EditableLabel({ value, editing, onCommit, onDone, className = '', style, placeholder }: Props) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  const draftRef = useRef(draft)
  const onCommitRef = useRef(onCommit)
  const cancelledRef = useRef(false)

  useEffect(() => {
    draftRef.current = draft
    onCommitRef.current = onCommit
  })

  useEffect(() => {
    if (!editing) return
    cancelledRef.current = false
    setDraft(value)
    draftRef.current = value
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => {
      if (!cancelledRef.current) onCommitRef.current(draftRef.current.trim())
    }
    // Only react to editing starting or stopping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [draft, editing])

  if (!editing) {
    return value ? (
      <div className={className} style={style}>
        {value}
      </div>
    ) : null
  }

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation()
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onDone()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelledRef.current = true
      onDone()
    }
  }

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={onDone}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      style={style}
      className={`nodrag nopan resize-none overflow-hidden rounded-sm bg-white outline-none ring-2 ring-blue-500 ${className}`}
    />
  )
}
