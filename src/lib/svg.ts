/** Base64 of the SVG files at these paths (from the app's own /aws-icons). Missing files are skipped. */
export async function loadSvgImages(paths: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    [...new Set(paths)].map(async (path) => {
      const response = await fetch(path)
      if (!response.ok) return null
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return [path, btoa(binary)] as const
    }),
  )
  return Object.fromEntries(entries.filter((entry) => entry !== null))
}
