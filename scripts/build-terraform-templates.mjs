// Builds src/exporters/terraform-templates.json from the hashicorp/aws provider schema:
// for every Terraform type the exporter can emit, its required arguments and required
// nested blocks, so scaffolds pass `terraform validate`.
//
// The output is committed, so this only needs re-running when mappings change:
//   mkdir tf && cd tf && printf 'terraform { required_providers { aws = { source = "hashicorp/aws" } } }' > main.tf
//   terraform init && terraform providers schema -json > schema.json
//   node scripts/build-terraform-templates.mjs tf/schema.json

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OVERRIDES } from './data/code-mapping-overrides.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemaPath = process.argv[2]
if (!schemaPath) {
  console.error('Usage: node scripts/build-terraform-templates.mjs <terraform providers schema -json output>')
  process.exit(1)
}

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const provider = schema.provider_schemas['registry.terraform.io/hashicorp/aws']
const resources = provider.resource_schemas

// Types used for icons, plus those the exporter emits for groups.
const GROUP_TYPES = ['aws_vpc', 'aws_subnet', 'aws_security_group', 'aws_autoscaling_group']
const types = [...new Set([...Object.values(OVERRIDES).map((o) => o.terraformType).filter(Boolean), ...GROUP_TYPES])].sort()

function attributeType(attribute) {
  if (attribute.type) return attribute.type
  // Plugin-framework resources describe structured attributes with nested_type.
  const nested = attribute.nested_type
  return ['nested', nested.nesting_mode, requiredAttributes(nested.attributes ?? {})]
}

function requiredAttributes(attributes) {
  return Object.entries(attributes)
    .filter(([, attribute]) => attribute.required)
    .map(([name, attribute]) => [name, attributeType(attribute)])
}

function simplify(block) {
  return {
    attributes: requiredAttributes(block.attributes ?? {}),
    blocks: Object.entries(block.block_types ?? {})
      .filter(([, nested]) => (nested.min_items ?? 0) >= 1)
      .map(([name, nested]) => ({ name, ...simplify(nested.block) })),
  }
}

const templates = {}
const missing = []
for (const type of types) {
  const resource = resources[type]
  if (!resource) {
    missing.push(type)
    continue
  }
  templates[type] = { ...simplify(resource.block), tags: Boolean(resource.block.attributes?.tags) }
}
if (missing.length) {
  console.error(`Unknown Terraform resource types: ${missing.join(', ')}`)
  process.exit(1)
}

const version = schema.format_version
writeFileSync(
  join(root, 'src/exporters/terraform-templates.json'),
  JSON.stringify({ source: `hashicorp/aws provider schema (format ${version})`, resources: templates }, null, 1) + '\n',
)
console.log(`Wrote templates for ${types.length} Terraform resource types`)
