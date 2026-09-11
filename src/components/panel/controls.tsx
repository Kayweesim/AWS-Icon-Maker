import { useState, type ReactNode } from 'react'

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

/** Text input that commits on blur or Enter, so typing doesn't create an undo step per keystroke. */
export function TextField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string
  value: string
  placeholder?: string
  onCommit: (value: string) => void
}) {
  // The draft remembers which value it was based on, so outside changes (undo, canvas edits) reset it.
  const [draft, setDraft] = useState({ base: value, text: value })
  const text = draft.base === value ? draft.text : value

  return (
    <Field label={label}>
      <input
        aria-label={label}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setDraft({ base: value, text: e.target.value })}
        onBlur={() => text !== value && onCommit(text.trim())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft({ base: value, text: value })
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
          }
        }}
        className={inputClass}
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
