// Ranked search over icons and groups for quick add.
import { codeMappingFor } from './codeMappings'
import { GROUP_TYPES, groupIconPath, groupStyle, type GroupType } from './groups'
import { iconCategories, type IconEntry } from './icons'

export type QuickItem =
  | { kind: 'icon'; key: string; name: string; detail: string; iconPath: string; icon: IconEntry }
  | { kind: 'group'; key: string; name: string; detail: string; iconPath?: string; groupType: GroupType }

/** How many results quick add shows: enough to scan at a glance without scrolling. */
export const QUICK_ADD_LIMIT = 8

/** Shown before anything is typed: the services most diagrams start with. */
const SUGGESTED = [
  'svc:Compute/Amazon-EC2',
  'svc:Compute/AWS-Lambda',
  'svc:Storage/Amazon-Simple-Storage-Service',
  'svc:Databases/Amazon-RDS',
]

type Entry = {
  item: QuickItem
  name: string
  /** Name without "Amazon"/"AWS", so "lambda" is an exact match for "AWS Lambda". */
  short: string
  words: string[]
  /** Abbreviations and alternative names, e.g. "s3", "sqs", "alb". */
  aliases: string[]
  haystack: string
  isService: boolean
}

const stripVendor = (name: string) => name.replace(/^(amazon|aws)\s+/, '')

function entry(item: QuickItem, aliases: string[], isService: boolean): Entry {
  const name = item.name.toLowerCase()
  return {
    item,
    name,
    short: stripVendor(name),
    words: name.split(/[\s/&(),.-]+/).filter(Boolean),
    aliases,
    haystack: `${name} ${item.detail.toLowerCase()} ${aliases.join(' ')}`,
    isService,
  }
}

function buildIndex(): Entry[] {
  const entries: Entry[] = []
  const seen = new Set<string>()
  for (const category of iconCategories) {
    for (const [icons, isService] of [
      [category.services, true],
      [category.resources, false],
    ] as const) {
      for (const icon of icons) {
        const detail = icon.service ?? category.name
        // Some services appear in two categories; list them once.
        const identity = `${isService}:${icon.name}:${icon.service ?? ''}`
        if (seen.has(identity)) continue
        seen.add(identity)
        // The code mappings carry short names: diagrams classes (S3, ALB) and logo slugs (sqs, elb).
        const mapping = codeMappingFor(icon.id)
        const aliases = [mapping?.diagramsClass?.split('.').at(-1), mapping?.mermaidIcon?.replace(/^logos:aws-?/, '')]
          .filter((alias): alias is string => !!alias && !alias.includes(':'))
          .map((alias) => alias.toLowerCase())
        entries.push(entry({ kind: 'icon', key: icon.id, name: icon.name, detail, iconPath: icon.path, icon }, aliases, isService))
      }
    }
  }
  for (const groupType of GROUP_TYPES) {
    const style = groupStyle(groupType)
    const item: QuickItem = { kind: 'group', key: `group:${groupType}`, name: style.label, detail: 'Group', iconPath: groupIconPath(groupType), groupType }
    entries.push(entry(item, ['group', 'container'], true))
  }
  return entries
}

function score(entry: Entry, phrase: string, terms: string[]): number {
  if (!terms.every((term) => entry.haystack.includes(term))) return -Infinity
  let points = 0
  if (entry.short === phrase || entry.name === phrase || entry.aliases.includes(phrase)) points += 1000
  else if (entry.short.startsWith(phrase) || entry.name.startsWith(phrase)) points += 600
  else if (` ${entry.name}`.includes(` ${phrase}`)) points += 400
  else if (entry.name.includes(phrase)) points += 200
  for (const term of terms) {
    if (entry.words.some((word) => word.startsWith(term))) points += 40
    else if (entry.aliases.some((alias) => alias.startsWith(term))) points += 30
    else if (entry.name.includes(term)) points += 15
  }
  if (entry.isService) points += 50
  // Among equals, shorter names are the more general match.
  return points - entry.name.length * 0.8
}

let index: Entry[] | null = null

export function quickSearch(query: string, limit = QUICK_ADD_LIMIT): QuickItem[] {
  index ??= buildIndex()
  const phrase = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!phrase) {
    return SUGGESTED.map((key) => index!.find((e) => e.item.key === key)?.item)
      .filter((item): item is QuickItem => !!item)
      .slice(0, limit)
  }
  const terms = phrase.split(' ')
  return index
    .map((e) => ({ e, points: score(e, phrase, terms) }))
    .filter(({ points }) => points > -Infinity)
    .sort((a, b) => b.points - a.points || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map(({ e }) => e.item)
}
