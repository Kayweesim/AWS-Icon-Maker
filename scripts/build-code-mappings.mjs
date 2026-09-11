// Builds src/data/code-mappings.json: icon id -> { label, mermaidIcon, diagramsClass, terraformType }.
//
// Every icon in the manifest gets a label. Mermaid icons and Python `diagrams` classes are
// auto-matched by normalised name against snapshots of the iconify "logos" pack and the
// diagrams library (scripts/data). Hand-curated overrides fill in the rest, including all
// Terraform resource types.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OVERRIDES } from './data/code-mapping-overrides.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))

const manifestPath = join(root, 'src/data/icon-manifest.json')
if (!existsSync(manifestPath)) {
  console.error('src/data/icon-manifest.json is missing. Run `npm run icons` first.')
  process.exit(1)
}

const manifest = readJson('src/data/icon-manifest.json')
const logoNames = readJson('scripts/data/iconify-logos-aws.json')
const diagramsModules = readJson('scripts/data/diagrams-aws-classes.json').modules

const MERMAID_BUILTINS = new Set(['cloud', 'database', 'disk', 'internet', 'server'])

// Preferred diagrams module per palette category, used when a class name exists in several modules.
const CATEGORY_MODULES = {
  'Analytics': 'analytics',
  'Application Integration': 'integration',
  'Artificial Intelligence': 'ml',
  'Blockchain': 'blockchain',
  'Business Applications': 'business',
  'Cloud Financial Management': 'cost',
  'Compute': 'compute',
  'Containers': 'compute',
  'Customer Enablement': 'enablement',
  'Databases': 'database',
  'Developer Tools': 'devtools',
  'End User Computing': 'enduser',
  'Front-End Web & Mobile': 'mobile',
  'Games': 'game',
  'General': 'general',
  'Internet of Things': 'iot',
  'Management & Governance': 'management',
  'Media Services': 'media',
  'Migration & Modernization': 'migration',
  'Networking & Content Delivery': 'network',
  'Quantum Technologies': 'quantum',
  'Satellite': 'satellite',
  'Security & Identity': 'security',
  'Storage': 'storage',
}

const normalise = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const stripVendor = (name) => name.replace(/^(Amazon|AWS)\s+/i, '')

const classIndex = new Map()
const knownClasses = new Set()
for (const [module, classes] of Object.entries(diagramsModules)) {
  for (const cls of classes) {
    const path = `diagrams.aws.${module}.${cls}`
    knownClasses.add(path)
    const key = normalise(cls)
    classIndex.set(key, [...(classIndex.get(key) ?? []), path])
  }
}

const logoIndex = new Map(logoNames.map((name) => [normalise(name.replace(/^aws-?/, '')), `logos:${name}`]))
const knownLogos = new Set(logoNames.map((name) => `logos:${name}`))

function findClass(candidates, category) {
  const preferred = CATEGORY_MODULES[category]
  for (const candidate of candidates) {
    const hits = classIndex.get(normalise(candidate))
    if (hits) return hits.find((path) => path.split('.')[2] === preferred) ?? hits[0]
  }
  return undefined
}

function findLogo(candidates) {
  for (const candidate of candidates) {
    const hit = logoIndex.get(normalise(candidate))
    if (hit) return hit
  }
  return undefined
}

const compact = (entry) => Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined))

const mappings = {}
const byServiceName = new Map()

for (const category of manifest.categories) {
  for (const icon of category.services) {
    const entry = compact({
      label: icon.name,
      mermaidIcon: findLogo([stripVendor(icon.name)]),
      diagramsClass: findClass([stripVendor(icon.name), icon.name], category.name),
    })
    mappings[icon.id] = entry
    byServiceName.set(icon.name, entry)
  }
}

for (const category of manifest.categories) {
  for (const icon of category.resources) {
    const service = icon.service ? byServiceName.get(icon.service) : undefined
    // Resources match on "<service> <resource>" first, then inherit their service's icon and class.
    const combined = icon.service ? `${stripVendor(icon.service)} ${icon.name}` : icon.name
    mappings[icon.id] = compact({
      label: icon.service ? `${icon.service} ${icon.name}` : icon.name,
      mermaidIcon: findLogo([combined]) ?? service?.mermaidIcon,
      diagramsClass: findClass([combined], category.name) ?? service?.diagramsClass,
    })
  }
}

const problems = []
for (const [id, override] of Object.entries(OVERRIDES)) {
  if (!mappings[id]) problems.push(`override for unknown icon id ${id}`)
  if (override.mermaidIcon && !knownLogos.has(override.mermaidIcon) && !MERMAID_BUILTINS.has(override.mermaidIcon)) {
    problems.push(`${id}: unknown Mermaid icon ${override.mermaidIcon}`)
  }
  if (override.diagramsClass && !knownClasses.has(override.diagramsClass)) {
    problems.push(`${id}: unknown diagrams class ${override.diagramsClass}`)
  }
  if (mappings[id]) mappings[id] = { ...mappings[id], ...override }
}
if (problems.length) {
  console.error(`Code mapping overrides are invalid:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

const sorted = Object.fromEntries(Object.entries(mappings).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(join(root, 'src/data/code-mappings.json'), JSON.stringify({ mappings: sorted }, null, 1) + '\n')

const values = Object.values(sorted)
const count = (key) => values.filter((entry) => entry[key]).length
console.log(
  `Wrote ${values.length} code mappings (${count('mermaidIcon')} Mermaid icons, ` +
    `${count('diagramsClass')} diagrams classes, ${count('terraformType')} Terraform types)`,
)
