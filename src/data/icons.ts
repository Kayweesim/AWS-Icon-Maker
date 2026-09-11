import manifest from './icon-manifest.json'

export type IconEntry = {
  id: string
  name: string
  path: string
  /** For resource icons, the service the resource belongs to. */
  service?: string
}

export type IconCategory = {
  name: string
  services: IconEntry[]
  resources: IconEntry[]
}

export const iconCategories = manifest.categories as IconCategory[]

/** Group icon file stem (e.g. "Virtual-private-cloud-VPC") -> public path. */
export const groupIconPaths = manifest.groups as Record<string, string>

function matches(icon: IconEntry, terms: string[]) {
  const haystack = `${icon.name} ${icon.service ?? ''}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function filterCategories(query: string): IconCategory[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return iconCategories
  return iconCategories
    .map((category) => ({
      ...category,
      services: category.services.filter((icon) => matches(icon, terms)),
      resources: category.resources.filter((icon) => matches(icon, terms)),
    }))
    .filter((category) => category.services.length + category.resources.length > 0)
}
