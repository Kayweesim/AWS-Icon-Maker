import { Check, Copy, LogOut, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Collaboration } from '../../collab/useCollaboration'
import { presenceColour, ROOM_CODE_LENGTH, roomPath } from '../../collab/room'
import { Menu } from './Menu'

const STATUS_LABEL: Record<string, string> = {
  initial: 'Connecting…',
  connecting: 'Connecting…',
  connected: 'Live',
  reconnecting: 'Reconnecting…',
  disconnected: 'Offline',
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?'

function Avatar({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white first:ml-0"
      style={{ backgroundColor: presenceColour(name) }}
    >
      {initials(name)}
    </span>
  )
}

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}${roomPath(code)}`

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}
      className="flex w-full items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-left text-[12px] text-zinc-600 hover:bg-zinc-50"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-zinc-400" />}
      <span className="flex-1 truncate">{link.replace(/^https?:\/\//, '')}</span>
      <span className="text-[11px] text-zinc-400">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

function JoinForm({ onJoin }: { onJoin: (code: string) => boolean }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setError(!onJoin(value))
      }}
      className="flex gap-1.5"
    >
      <input
        aria-label="Room code"
        value={value}
        onChange={(event) => {
          setValue(event.target.value.toUpperCase())
          setError(false)
        }}
        placeholder="ABCD"
        maxLength={40}
        className={`w-full min-w-0 rounded-md border px-2 py-1.5 text-[13px] tracking-widest uppercase outline-none focus:ring-2 ${
          error ? 'border-red-300 focus:ring-red-100' : 'border-zinc-200 focus:ring-blue-200'
        }`}
      />
      <button
        type="submit"
        disabled={value.trim().length < ROOM_CODE_LENGTH}
        className="rounded-md bg-zinc-900 px-2.5 text-[12px] font-medium text-white disabled:bg-zinc-200"
      >
        Join
      </button>
    </form>
  )
}

export function ShareMenu({ collab }: { collab: Collaboration }) {
  const { enabled, code, status, others, name, rename } = collab
  const live = code !== null && status === 'connected'

  return (
    <Menu
      width="w-72"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors ${
            open || code ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          {code ? (
            <>
              <span
                className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-green-500' : 'bg-amber-400'}`}
                title={STATUS_LABEL[status] ?? status}
              />
              <span className="tracking-widest">{code}</span>
              {others.length > 0 && (
                <span className="ml-1 flex">
                  {others.slice(0, 3).map((other) => (
                    <Avatar key={other.connectionId} name={other.presence.name || 'Guest'} />
                  ))}
                  {others.length > 3 && <span className="ml-1 text-[11px] text-zinc-500">+{others.length - 3}</span>}
                </span>
              )}
            </>
          ) : (
            <>
              <Users size={16} />
              Share
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-2.5 p-2">
          {!enabled ? (
            <p className="text-[12px] leading-relaxed text-zinc-500">
              Live editing is off. Set <code className="rounded bg-zinc-100 px-1">VITE_LIVEBLOCKS_PUBLIC_KEY</code> and
              redeploy to turn it on — see the README.
            </p>
          ) : code ? (
            <>
              <div>
                <div className="text-[13px] font-medium text-zinc-900">
                  Room <span className="tracking-widest">{code}</span>
                </div>
                <div className="text-[11.5px] text-zinc-400">
                  {STATUS_LABEL[status] ?? status} · {others.length === 0 ? 'only you' : `${others.length + 1} people`}
                </div>
              </div>
              <CopyLink code={code} />
              <label className="flex items-center gap-2 text-[12px] text-zinc-500">
                You
                <input
                  aria-label="Your name"
                  value={name}
                  onChange={(event) => rename(event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1 text-[13px] text-zinc-800 outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>
              {others.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {others.map((other) => (
                    <li key={other.connectionId} className="flex items-center gap-2 text-[12.5px] text-zinc-600">
                      <Avatar name={other.presence.name || 'Guest'} />
                      {other.presence.name || 'Guest'}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  collab.leave()
                  close()
                }}
                className="flex items-center gap-2 rounded-md px-1 py-1 text-left text-[12.5px] text-zinc-600 hover:text-zinc-900"
              >
                <LogOut size={14} className="text-zinc-400" />
                Leave the session (keeps a copy)
              </button>
            </>
          ) : (
            <>
              <p className="text-[12px] leading-relaxed text-zinc-500">
                Share this diagram live. Everyone with the link edits the same canvas.
              </p>
              <button
                type="button"
                onClick={() => {
                  collab.start()
                  close()
                }}
                className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800"
              >
                Start a session
              </button>
              <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                <span className="h-px flex-1 bg-zinc-100" />
                or join one
                <span className="h-px flex-1 bg-zinc-100" />
              </div>
              <JoinForm onJoin={collab.join} />
            </>
          )}
        </div>
      )}
    </Menu>
  )
}
