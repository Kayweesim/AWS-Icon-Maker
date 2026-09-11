// Diagram -> Terraform scaffold: one resource per node with placeholder values.
// Connections are listed as comments only; networking and IAM are never inferred from arrows.
import type { GroupType } from '../data/groups'
import { buildModel, makeIdentifiers, resolveEdges, walkTree, type DiagramModel, type ExportInput, type ModelNode } from './model'
import templates from './terraform-templates.json'

type AttributeType = string | unknown[]
type BlockTemplate = { name?: string; attributes: [string, AttributeType][]; blocks: BlockTemplate[]; tags?: boolean }

const TEMPLATES = templates.resources as unknown as Record<string, BlockTemplate>
const INDENT = '  '
const REGION_CODE = /^[a-z]{2}(-gov)?-[a-z]+-\d$/
const ACCOUNT = '123456789012'
const DEFAULT_REGION = 'us-east-1'

const GROUP_RESOURCES: Partial<Record<GroupType, string>> = {
  'vpc': 'aws_vpc',
  'public-subnet': 'aws_subnet',
  'private-subnet': 'aws_subnet',
  'security-group': 'aws_security_group',
  'auto-scaling-group': 'aws_autoscaling_group',
}

/** HCL strings use JSON-style escapes, plus doubling for template sequences. */
const hclString = (text: string) =>
  JSON.stringify(text)
    .replace(/\$\{/g, () => '$${')
    .replace(/%\{/g, () => '%%{')

type Context = {
  /** Resource name in kebab-case, e.g. "web-server-1". */
  name: string
  /** Resource name in snake_case, e.g. "web_server_1". */
  snake: string
  subnetIndex: number
}
type Value = (ctx: Context) => string

const quoted = (text: string): Value => () => JSON.stringify(text)
const literal = (text: string): Value => () => text
const kebabName: Value = (ctx) => hclString(ctx.name)
const roleArn = quoted(`arn:aws:iam::${ACCOUNT}:role/TODO`)

/** Placeholders for argument names, chosen to pass the provider's validation. */
const NAMED: Record<string, Value> = {
  ami: quoted('ami-00000000000000000'),
  instance_type: quoted('t3.micro'),
  instance_class: quoted('db.t3.micro'),
  node_type: quoted('cache.t3.micro'),
  cidr_block: (ctx) => `"10.0.${ctx.subnetIndex}.0/24"`,
  runtime: quoted('python3.12'),
  handler: quoted('main.handler'),
  role: roleArn,
  role_arn: roleArn,
  service_role: roleArn,
  service_role_arn: roleArn,
  execution_role_arn: roleArn,
  assume_role_policy: literal(
    'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ec2.amazonaws.com" } }] })',
  ),
  definition: literal('jsonencode({ StartAt = "Done", States = { Done = { Type = "Succeed" } } })'),
  container_definitions: literal('jsonencode([{ name = "app", image = "TODO", essential = true }])'),
  vpc_id: quoted('vpc-00000000'),
  subnet_id: quoted('subnet-00000000'),
  subnet_ids: literal('["subnet-00000000", "subnet-11111111"]'),
  subnets: literal('["subnet-00000000", "subnet-11111111"]'),
  security_group_ids: literal('["sg-00000000"]'),
  domain_name: quoted('example.com'),
  email_identity: quoted('example.com'),
  password: quoted('TODO-change-me-123'),
  origin_id: quoted('primary'),
  target_origin_id: quoted('primary'),
  viewer_protocol_policy: quoted('redirect-to-https'),
  allowed_methods: literal('["GET", "HEAD"]'),
  cached_methods: literal('["GET", "HEAD"]'),
  restriction_type: quoted('none'),
  cloudfront_default_certificate: literal('true'),
  name: kebabName,
  function_name: kebabName,
  bucket: kebabName,
  cluster_id: kebabName,
  cluster_identifier: kebabName,
  identifier: kebabName,
  stack_name: kebabName,
}

/**
 * Arguments the schema doesn't require but a useful, valid scaffold needs, per resource type.
 * `null` takes the value from NAMED.
 */
const SUGGESTED: Record<string, Record<string, Value | null>> = {
  aws_vpc: { cidr_block: quoted('10.0.0.0/16') },
  aws_subnet: { cidr_block: null },
  aws_security_group: { name: null, description: quoted('TODO') },
  aws_instance: { ami: null, instance_type: null },
  aws_lb: { name: null, load_balancer_type: quoted('application'), subnets: null },
  aws_db_instance: {
    identifier: null,
    engine: quoted('postgres'),
    instance_class: null,
    allocated_storage: literal('20'),
    username: quoted('app_admin'),
    manage_master_user_password: literal('true'),
    skip_final_snapshot: literal('true'),
  },
  aws_rds_cluster: {
    cluster_identifier: null,
    engine: quoted('aurora-postgresql'),
    master_username: quoted('app_admin'),
    manage_master_user_password: literal('true'),
    skip_final_snapshot: literal('true'),
  },
  aws_rds_cluster_instance: { instance_class: quoted('db.r6g.large'), engine: quoted('aurora-postgresql') },
  aws_s3_bucket: { bucket: null },
  aws_lambda_function: { runtime: null, handler: null, filename: quoted('lambda.zip') },
  aws_dynamodb_table: { billing_mode: quoted('PAY_PER_REQUEST'), hash_key: quoted('id') },
  aws_elasticache_cluster: { engine: quoted('redis'), node_type: null, num_cache_nodes: literal('1') },
  aws_sqs_queue: { name: null },
  aws_sns_topic: { name: null },
  aws_kms_key: { description: quoted('TODO') },
  aws_cloudwatch_log_group: { name: null },
  aws_ecr_repository: { name: null },
  aws_efs_file_system: { creation_token: kebabName },
  aws_ebs_volume: { size: literal('20') },
  aws_route53_zone: { name: null },
  aws_nat_gateway: { subnet_id: null },
  aws_internet_gateway: { vpc_id: null },
  aws_ssm_parameter: { type: quoted('String'), value: quoted('TODO') },
  aws_opensearch_domain: { domain_name: (ctx) => hclString(ctx.name.slice(0, 28)) },
  aws_kinesis_firehose_delivery_stream: { destination: quoted('extended_s3') },
  aws_mq_broker: { engine_type: quoted('ACTIVEMQ'), engine_version: quoted('5.18'), host_instance_type: quoted('mq.t3.micro') },
  aws_appsync_graphql_api: { authentication_type: quoted('API_KEY') },
  aws_batch_compute_environment: { type: quoted('UNMANAGED') },
  aws_keyspaces_keyspace: { name: (ctx) => hclString(ctx.snake) },
  aws_dx_connection: { bandwidth: quoted('1Gbps') },
  aws_vpn_connection: { type: quoted('ipsec.1'), vpn_gateway_id: quoted('vgw-00000000') },
  aws_acm_certificate: { domain_name: null, validation_method: quoted('DNS') },
  aws_networkfirewall_firewall: { vpc_id: null },
  aws_wafv2_web_acl: { scope: quoted('REGIONAL') },
}

type Attribute = [string, string]

/** A block with `=` aligned the way `terraform fmt` does it. */
function hclBlock(name: string, attributes: Attribute[], children: string[][] = []): string[] {
  const width = Math.max(0, ...attributes.map(([key]) => key.length))
  const body = attributes.map(([key, value]) => `${INDENT}${key.padEnd(width)} = ${value}`)
  for (const child of children) {
    if (body.length) body.push('')
    body.push(...child.map((line) => (line ? INDENT + line : line)))
  }
  return [`${name} {`, ...body, '}']
}

const pipelineStage = (stage: string, action: Attribute[]) =>
  hclBlock('stage', [['name', JSON.stringify(stage)]], [hclBlock('action', action)])

/**
 * Nested blocks whose valid contents depend on one-of or enum rules the schema can't express.
 * They replace the template's block of the same name; blocks not in the template are appended.
 */
const BLOCKS: Record<string, Record<string, string[]>> = {
  aws_apprunner_service: {
    source_configuration: hclBlock('source_configuration', [], [
      hclBlock('image_repository', [
        ['image_identifier', '"public.ecr.aws/aws-containers/hello-app-runner:latest"'],
        ['image_repository_type', '"ECR_PUBLIC"'],
      ]),
    ]),
  },
  aws_autoscaling_group: {
    launch_template: hclBlock('launch_template', [['id', '"lt-00000000000000000"'], ['version', '"$Latest"']]),
  },
  aws_codebuild_project: {
    artifacts: hclBlock('artifacts', [['type', '"NO_ARTIFACTS"']]),
    environment: hclBlock('environment', [
      ['compute_type', '"BUILD_GENERAL1_SMALL"'],
      ['image', '"aws/codebuild/amazonlinux-x86_64-standard:5.0"'],
      ['type', '"LINUX_CONTAINER"'],
    ]),
    source: hclBlock('source', [['type', '"NO_SOURCE"'], ['buildspec', '"TODO"']]),
  },
  aws_codepipeline: {
    artifact_store: hclBlock('artifact_store', [['location', '"TODO"'], ['type', '"S3"']]),
    stage: [
      ...pipelineStage('Source', [
        ['name', '"Source"'],
        ['category', '"Source"'],
        ['owner', '"AWS"'],
        ['provider', '"CodeStarSourceConnection"'],
        ['version', '"1"'],
        ['output_artifacts', '["source"]'],
      ]),
      '',
      ...pipelineStage('Build', [
        ['name', '"Build"'],
        ['category', '"Build"'],
        ['owner', '"AWS"'],
        ['provider', '"CodeBuild"'],
        ['version', '"1"'],
        ['input_artifacts', '["source"]'],
      ]),
    ],
  },
  aws_dynamodb_table: {
    attribute: hclBlock('attribute', [['name', '"id"'], ['type', '"S"']]),
  },
  aws_ec2_client_vpn_endpoint: {
    authentication_options: hclBlock('authentication_options', [
      ['type', '"certificate-authentication"'],
      ['root_certificate_chain_arn', `"arn:aws:acm:${DEFAULT_REGION}:${ACCOUNT}:certificate/TODO"`],
    ]),
  },
  aws_kinesis_firehose_delivery_stream: {
    extended_s3_configuration: hclBlock('extended_s3_configuration', [
      ['bucket_arn', '"arn:aws:s3:::TODO"'],
      ['role_arn', `"arn:aws:iam::${ACCOUNT}:role/TODO"`],
    ]),
  },
  aws_wafv2_web_acl: {
    default_action: hclBlock('default_action', [], [['allow {}']]),
  },
}

const arnPlaceholder = (name: string) =>
  `"arn:aws:${name.replace(/_?arns?$/, '').replace(/_/g, '-') || 'service'}:${DEFAULT_REGION}:${ACCOUNT}:TODO"`

function placeholder(name: string, type: AttributeType, ctx: Context): string {
  const named = NAMED[name]
  if (named) return named(ctx)
  if (typeof type === 'string') {
    if (type === 'number') return '0'
    if (type === 'bool') return 'false'
    return /(^|_)arns?$/.test(name) ? arnPlaceholder(name) : '"TODO"'
  }
  const [kind, second, third] = type as [string, unknown, unknown]
  if (kind === 'list' || kind === 'set') return `[${placeholder(name.replace(/s$/, ''), second as AttributeType, ctx)}]`
  if (kind === 'map') return '{}'
  if (kind === 'object') {
    const fields = Object.entries(second as Record<string, AttributeType>)
    return `{ ${fields.map(([key, fieldType]) => `${key} = ${placeholder(key, fieldType, ctx)}`).join(', ')} }`
  }
  if (kind === 'nested') {
    const fields = (third as [string, AttributeType][]).map(([key, fieldType]) => `${key} = ${placeholder(key, fieldType, ctx)}`)
    const object = `{ ${fields.join(', ')} }`
    return second === 'single' ? object : `[${object}]`
  }
  return '"TODO"'
}

const opensBlock = (line: string | undefined) => !!line && line.trimEnd().endsWith('{')

function pushBlockBody(
  lines: string[],
  indent: string,
  block: BlockTemplate,
  ctx: Context,
  extra: Attribute[] = [],
  overrides: Record<string, string[]> = {},
) {
  const attributes: Attribute[] = block.attributes.map(([name, type]) => [
    name,
    extra.find(([key]) => key === name)?.[1] ?? placeholder(name, type, ctx),
  ])
  for (const [name, value] of extra) if (!attributes.some(([key]) => key === name)) attributes.push([name, value])
  const width = Math.max(0, ...attributes.map(([key]) => key.length))
  for (const [key, value] of attributes) lines.push(`${indent}${key.padEnd(width)} = ${value}`)

  const pushBlockLines = (blockLines: string[]) => {
    if (!opensBlock(lines.at(-1))) lines.push('')
    lines.push(...blockLines.map((line) => (line ? indent + line : line)))
  }
  for (const nested of block.blocks) {
    if (overrides[nested.name!]) {
      pushBlockLines(overrides[nested.name!])
      continue
    }
    if (!opensBlock(lines.at(-1))) lines.push('')
    lines.push(`${indent}${nested.name} {`)
    pushBlockBody(lines, indent + INDENT, nested, ctx)
    lines.push(`${indent}}`)
  }
  for (const [name, blockLines] of Object.entries(overrides)) {
    if (!block.blocks.some((nested) => nested.name === name)) pushBlockLines(blockLines)
  }
}

function ancestorOfType(model: DiagramModel, node: ModelNode, groupType: GroupType) {
  for (let cursor = node.parentId; cursor; cursor = model.nodes.get(cursor)?.parentId) {
    const ancestor = model.nodes.get(cursor)
    if (ancestor?.groupType === groupType) return ancestor
  }
  return undefined
}

const describe = (node: ModelNode) => (node.label === node.serviceName ? node.label : `${node.label} (${node.serviceName})`)

export function exportTerraform(input: ExportInput): string {
  const model = buildModel(input)
  const ids = makeIdentifiers(model)
  const resourceTypes = new Map<string, string>()
  for (const node of model.nodes.values()) {
    const type = node.kind === 'group' ? GROUP_RESOURCES[node.groupType!] : node.mapping?.terraformType
    if (type && TEMPLATES[type]) resourceTypes.set(node.id, type)
  }
  const address = (id: string) => (resourceTypes.has(id) ? `${resourceTypes.get(id)}.${ids.get(id)}` : ids.get(id)!)
  const region = [...model.nodes.values()].find((n) => n.groupType === 'region' && REGION_CODE.test(n.label))?.label

  const lines = [
    `# ${model.name}: Terraform scaffold generated by AWS Diagram Studio.`,
    '#',
    '# This is a starting point, not a working configuration. Every value is a placeholder',
    '# to replace. Connections in the diagram are listed at the end as comments only:',
    '# networking, security group rules and IAM permissions are not inferred from arrows.',
    '',
    'terraform {',
    '  required_providers {',
    '    aws = {',
    '      source  = "hashicorp/aws"',
    '      version = "~> 6.0"',
    '    }',
    '  }',
    '}',
    '',
    'provider "aws" {',
    ...(region ? [`  region = ${hclString(region)}`] : ['  # TODO: set your region', `  region = "${DEFAULT_REGION}"`]),
    '}',
  ]

  let subnetIndex = 0
  walkTree(model, {
    enter: (node) => {
      const parent = node.parentId ? model.nodes.get(node.parentId) : undefined
      const location = parent ? `, in ${parent.label}` : ''
      const type = resourceTypes.get(node.id)
      lines.push('')

      if (!type) {
        if (node.kind === 'group') {
          lines.push(`# ${describe(node)}${location}: grouping only, no resource`)
        } else {
          lines.push(`# TODO: unmapped ${node.serviceName} ("${node.label}")${location}: no Terraform resource type is known`)
          lines.push(`# resource "TODO" "${ids.get(node.id)}" {}`)
        }
        return
      }

      const snake = ids.get(node.id)!
      const ctx: Context = { name: snake.replace(/_/g, '-'), snake, subnetIndex: type === 'aws_subnet' ? ++subnetIndex : 0 }
      const extra: Attribute[] = Object.entries(SUGGESTED[type] ?? {}).map(([name, value]) => [name, (value ?? NAMED[name])(ctx)])
      // Containment is structure, not an arrow: subnets and security groups reference their VPC.
      const vpc = ancestorOfType(model, node, 'vpc')
      if (vpc && (type === 'aws_subnet' || type === 'aws_security_group')) extra.unshift(['vpc_id', `${address(vpc.id)}.id`])

      lines.push(`# ${describe(node)}${location}`)
      if (parent && resourceTypes.get(parent.id) === 'aws_subnet' && node.kind === 'icon') {
        lines.push(`# TODO: place it in ${address(parent.id)} (for example with subnet_id)`)
      }
      lines.push(`resource "${type}" "${snake}" {`)
      const template = TEMPLATES[type]
      pushBlockBody(lines, INDENT, template, ctx, extra, BLOCKS[type])
      if (template.tags) {
        if (!opensBlock(lines.at(-1))) lines.push('')
        lines.push(`${INDENT}tags = {`, `${INDENT}${INDENT}Name = ${hclString(node.label)}`, `${INDENT}}`)
      }
      lines.push('}')
    },
  })

  if (model.nodes.size === 0) lines.push('', '# The diagram is empty')
  if (model.notes.length) {
    lines.push('', ...model.notes.map((note) => `# Note${note.parentLabel ? ` (in ${note.parentLabel})` : ''}: ${note.label}`))
  }

  const { resolved, skipped } = resolveEdges(model)
  if (resolved.length || skipped.length) {
    lines.push('', '# Connections in the diagram (for reference; not converted to configuration):')
    for (const { edge, source, target } of resolved) {
      const arrow = edge.arrows === 'both' ? '<->' : edge.arrows === 'none' ? '--' : '->'
      lines.push(`#   ${address(source.node.id)} ${arrow} ${address(target.node.id)}${edge.label ? ` (${edge.label})` : ''}`)
    }
    for (const { edge, reason } of skipped) {
      lines.push(`#   skipped${edge.label ? ` "${edge.label}"` : ''}: ${reason}`)
    }
  }

  return `${lines.join('\n')}\n`
}
