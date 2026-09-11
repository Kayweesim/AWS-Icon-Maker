export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Label for the primary modifier key, e.g. "⌘" on macOS and "Ctrl+" elsewhere. */
export const mod = isMac ? '⌘' : 'Ctrl+'
export const shift = isMac ? '⇧' : 'Shift+'
