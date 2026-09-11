// Downloads the official AWS Architecture Icons asset package and copies the
// SVGs the app uses into public/aws-icons. Icons are copied byte-for-byte:
// the AWS icon guidelines forbid altering them.
//
//   services/<Category>/Arch_<Name>_48.svg   (48px service icons)
//   resources/<Category>/Res_<Name>_48.svg   (48px resource icons, light variants)
//   groups/<Name>_32.svg                     (32px group icons, light variants)

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_URL =
  process.env.AWS_ICONS_URL ??
  'https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, '.icon-cache')
const zipPath = join(cacheDir, 'icon-package.zip')
const extractDir = join(cacheDir, 'extracted')
const outDir = join(root, 'public', 'aws-icons')

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

async function download() {
  if (existsSync(zipPath)) return
  mkdirSync(cacheDir, { recursive: true })
  console.log(`Downloading ${PACKAGE_URL}`)
  const res = await fetch(PACKAGE_URL)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()))
}

function extract() {
  rmSync(extractDir, { recursive: true, force: true })
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', extractDir])
}

function findTopDir(prefix) {
  const dir = readdirSync(extractDir).find((name) => name.startsWith(prefix))
  if (!dir) throw new Error(`Package is missing a ${prefix}* folder`)
  return join(extractDir, dir)
}

function copy(src, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest)
}

function copyIcons() {
  rmSync(outDir, { recursive: true, force: true })
  let count = 0

  const services = findTopDir('Architecture-Service-Icons')
  for (const file of walk(services)) {
    // Only the 48px size; skip dark-background variants.
    if (!/\/48\/[^/]+_48\.svg$/.test(file) || /_Dark_48\.svg$/.test(file)) continue
    const category = basename(dirname(dirname(file))).replace(/^Arch_/, '')
    copy(file, join(outDir, 'services', category, basename(file)))
    count++
  }

  const resources = findTopDir('Resource-Icons')
  for (const file of walk(resources)) {
    if (!/_48(_Light)?\.svg$/.test(file)) continue
    const category = basename(file.slice(resources.length + 1).split('/')[0]).replace(/^Res_/, '')
    copy(file, join(outDir, 'resources', category, basename(file)))
    count++
  }

  const groups = findTopDir('Architecture-Group-Icons')
  for (const file of walk(groups)) {
    if (!/_32\.svg$/.test(file)) continue
    copy(file, join(outDir, 'groups', basename(file)))
    count++
  }

  console.log(`Copied ${count} SVG icons to public/aws-icons`)
}

if (process.argv.includes('--if-missing') && existsSync(join(outDir, 'services'))) {
  process.exit(0)
}

await download()
extract()
copyIcons()
