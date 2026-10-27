import { useState, type ReactNode } from 'react'
import { normalizeColor } from '../../lib/appearance'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </div>
  )
}

type Option<T extends string> = { value: T; label: string }

/** Segmented control. `value` may be undefined when a multi-selection has mixed values. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | undefined
  options: Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <Field label={label}>
      <div role="radiogroup" aria-label={label} className="grid grid-flow-col gap-0.5 rounded-md bg-zinc-100 p-0.5">
        {options.map((option) => {
          const checked = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={`h-7 rounded-[5px] px-2 text-[12px] transition-colors ${
                checked ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

const inputClass =
  'w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

/** A size edit is committed once on blur/Enter; empty and invalid drafts leave geometry alone. */
export function NumberField({ label, value, min, max, step = 1, onCommit }: {
  label: string; value: number | undefined; min: number; max: number; step?: number; onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState({ base: value, text: value === undefined ? '' : String(value) })
  const text = draft.base === value ? draft.text : value === undefined ? '' : String(value)
  return (
    <Field label={label}>
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        placeholder="Mixed"
        value={text}
        onChange={(event) => setDraft({ base: value, text: event.target.value })}
        onBlur={() => {
          const parsed = text.trim() ? Number(text) : NaN
          const next = Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed / step) * step)) : value
          // The store may further constrain a linked dimension; display its actual value.
          setDraft({ base: value, text: value === undefined ? '' : String(value) })
          if (next !== undefined && next !== value) onCommit(next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft({ base: value, text: value === undefined ? '' : String(value) })
            requestAnimationFrame(() => (event.target as HTMLInputElement).blur())
          }
        }}
        className={inputClass}
      />
    </Field>
  )
}

const COLOR_PRESETS = ['#18181b', '#545b64', '#2563eb', '#dc2626', '#ea580c', '#16a34a', '#9333ea', '#ffffff']

/** Picker/hex drafts apply once; palette choices are immediate, undoable changes. */
export function ColorField({ label, value, onCommit }: {
  label: string; value: string | undefined; onCommit: (color: string) => void
}) {
  const [draft, setDraft] = useState({ base: value, text: value ?? '' })
  const text = draft.base === value ? draft.text : value ?? ''
  const color = normalizeColor(text)
  const apply = () => {
    if (!color) return
    setDraft({ base: value, text: value ?? '' })
    if (color !== value) onCommit(color)
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={color ?? value ?? '#18181b'}
          onChange={(event) => setDraft({ base: value, text: event.target.value })}
          className="h-8 w-9 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
        />
        <input
          aria-label={`${label} hex`}
          aria-invalid={!!text && !color}
          placeholder={value === undefined ? 'Mixed' : '#000000'}
          value={text}
          onChange={(event) => setDraft({ base: value, text: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); apply() }
            if (event.key === 'Escape') {
              setDraft({ base: value, text: value ?? '' })
              event.currentTarget.blur()
            }
          }}
          className={`${inputClass} min-w-0 font-mono`}
        />
        <button
          type="button"
          aria-label={`Apply ${label.toLowerCase()}`}
          disabled={!color || color === value}
          onClick={apply}
          className="h-8 rounded border border-zinc-200 px-2 text-[12px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >Apply</button>
      </div>
      <div className="flex justify-between gap-1">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`${label}: ${preset}`}
            aria-pressed={value === preset}
            title={preset}
            onClick={() => {
              setDraft({ base: value, text: value ?? '' })
              if (preset !== value) onCommit(preset)
            }}
            className="h-5 w-5 rounded-full border border-zinc-300 ring-offset-1 aria-pressed:ring-2 aria-pressed:ring-blue-500 focus-visible:outline-2 focus-visible:outline-blue-500"
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
      {text && !color && <span className="text-[11px] text-red-600">Use a hex colour, e.g. #2563eb.</span>}
    </Field>
  )
}

/** Text input that commits on blur or Enter, so typing doesn't create an undo step per keystroke. */
export function TextField({
  label,
  value,
  placeholder,
  multiline = false,
  onCommit,
}: {
  label: string
  value: string
  placeholder?: string
  multiline?: boolean
  onCommit: (value: string) => void
}) {
  // The draft remembers which value it was based on, so outside changes (undo, canvas edits) reset it.
  const [draft, setDraft] = useState({ base: value, text: value })
  const text = draft.base === value ? draft.text : value
  const Control = multiline ? 'textarea' : 'input'

  return (
    <Field label={label}>
      <Control
        aria-label={label}
        rows={multiline ? 3 : undefined}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setDraft({ base: value, text: e.target.value })}
        onBlur={() => {
          setDraft({ base: value, text: value })
          if (text.trim() !== value) onCommit(text.trim())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setDraft({ base: value, text: value })
            requestAnimationFrame(() => (e.target as HTMLInputElement | HTMLTextAreaElement).blur())
          }
        }}
        className={`${inputClass}${multiline ? ' resize-y' : ''}`}
      />
    </Field>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <Field label={label}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
