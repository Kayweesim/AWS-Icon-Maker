// Scans public/aws-icons (populated by fetch-icons.mjs) and writes
// src/data/icon-manifest.json: category -> icons (name -> path).

import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'aws-icons')
const manifestPath = join(root, 'src', 'data', 'icon-manifest.json')

// Folder names in the package -> display names used in the official deck.
// Resource folders use a few different spellings, so they map to the same names.
const CATEGORY_NAMES = {
  'Analytics': 'Analytics',
  'Application-Integration': 'Application Integration',
  'Artificial-Intelligence': 'Artificial Intelligence',
  'Blockchain': 'Blockchain',
  'Business-Applications': 'Business Applications',
  'Cloud-Financial-Management': 'Cloud Financial Management',
  'Compute': 'Compute',
  'Containers': 'Containers',
  'Customer-Enablement': 'Customer Enablement',
  'Databases': 'Databases',
  'Developer-Tools': 'Developer Tools',
  'End-User-Computing': 'End User Computing',
  'Front-End-Web-Mobile': 'Front-End Web & Mobile',
  'Games': 'Games',
  'General-Icons': 'General',
  'Internet-of-Things': 'Internet of Things',
  'IoT': 'Internet of Things',
  'Management-Tools': 'Management & Governance',
  'Management-Governance': 'Management & Governance',
  'Media-Services': 'Media Services',
  'Migration-Modernization': 'Migration & Modernization',
  'Networking-Content-Delivery': 'Networking & Content Delivery',
  'Quantum-Technologies': 'Quantum Technologies',
  'Satellite': 'Satellite',
  'Security-Identity': 'Security & Identity',
  'Storage': 'Storage',
}

// Categories most diagrams reach for first; everything else follows alphabetically.
const PRIORITY = [
  'General',
  'Compute',
  'Containers',
  'Storage',
  'Databases',
  'Networking & Content Delivery',
  'Security & Identity',
  'Application Integration',
  'Analytics',
  'Management & Governance',
]

// Hyphens in file names stand in for spaces, but a few names contain real hyphens.
const HYPHENATED = [
  'Site-to-Site', 'Point-to-Point', 'End-to-End', 'Multi-AZ', 'Front-End', 'Back-End',
  'Real-Time', 'On-Premises', 'Self-Hosted', 'Multi-Region', 'Single-AZ', 'Cross-Account',
  'Built-in', 'Pre-Trained', 'e-Commerce', 'Read-Replica', 'Low-Code', 'Cross-Region',
]

function humanize(raw) {
  let name = raw.replace(/-/g, ' ')
  for (const phrase of HYPHENATED) {
    name = name.replace(new RegExp(phrase.replace(/-/g, ' '), 'gi'), phrase)
  }
  return name.replace(/\s+/g, ' ').trim()
}

function categoryName(folder) {
  const name = CATEGORY_NAMES[folder]
  if (!name) console.warn(`Unknown category folder "${folder}", using a derived name`)
  return name ?? humanize(folder)
}

function listDirs(dir) {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
}

function listSvgs(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.svg')).sort()
}

if (!existsSync(iconsDir)) {
  console.error('public/aws-icons is missing. Run `npm run icons` first.')
  process.exit(1)
}

const categories = new Map()
function bucket(name) {
  if (!categories.has(name)) categories.set(name, { name, services: [], resources: [] })
  return categories.get(name)
}

for (const folder of listDirs(join(iconsDir, 'services'))) {
  const target = bucket(categoryName(folder))
  for (const file of listSvgs(join(iconsDir, 'services', folder))) {
    const raw = file.replace(/^Arch_/, '').replace(/(_Light)?_48\.svg$/, '')
    target.services.push({
      // Some services appear in more than one category, so the folder is part of the id.
      id: `svc:${folder}/${raw}`,
      name: humanize(raw),
      path: `/aws-icons/services/${folder}/${file}`,
    })
  }
}

for (const folder of listDirs(join(iconsDir, 'resources'))) {
  const target = bucket(categoryName(folder))
  for (const file of listSvgs(join(iconsDir, 'resources', folder))) {
    const raw = file.replace(/^Res_/, '').replace(/_48(_Light)?\.svg$/, '')
    // Resource names look like "Amazon-EC2_Instance": service, then resource.
    const parts = raw.split('_')
    const name = humanize(parts.length > 1 ? parts.slice(1).join(' ') : parts[0])
    const service = parts.length > 1 ? humanize(parts[0]) : undefined
    target.resources.push({
      id: `res:${folder}/${raw}`,
      name,
      ...(service && { service }),
      path: `/aws-icons/resources/${folder}/${file}`,
    })
  }
}

const groups = existsSync(join(iconsDir, 'groups'))
  ? Object.fromEntries(
      listSvgs(join(iconsDir, 'groups'))
        .filter((f) => !f.includes('_Dark'))
        .map((f) => [f.replace(/_32\.svg$/, ''), `/aws-icons/groups/${f}`]),
    )
  : {}

const rank = (name) => {
  const i = PRIORITY.indexOf(name)
  return i === -1 ? PRIORITY.length : i
}
const sorted = [...categories.values()]
  .filter((c) => c.services.length + c.resources.length > 0)
  .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))

const manifest = { categories: sorted, groups }
mkdirSync(dirname(manifestPath), { recursive: true })
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

const iconCount = sorted.reduce((n, c) => n + c.services.length + c.resources.length, 0)
console.log(`Wrote ${iconCount} icons in ${sorted.length} categories and ${Object.keys(groups).length} group icons`)
