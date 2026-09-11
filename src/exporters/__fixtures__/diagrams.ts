import type { AppEdge, AppNode, GroupNode, IconNode } from '../../types'
import { toExportInput, type ExportInput } from '../model'

const ICONS = {
  alb: 'res:Networking-Content-Delivery/Elastic-Load-Balancing_Application-Load-Balancer',
  ec2: 'svc:Compute/Amazon-EC2',
  rds: 'svc:Databases/Amazon-RDS',
  lambda: 'svc:Compute/AWS-Lambda',
  appRunner: 'svc:Compute/AWS-App-Runner',
  users: 'res:General-Icons/Users',
}

export const icon = (id: string, label: string, iconId: string, x: number, y: number, parentId?: string): IconNode => ({
  id,
  type: 'icon',
  position: { x, y },
  ...(parentId && { parentId }),
  data: { label, iconId, iconPath: '/aws-icons/x.svg', iconSize: 64 },
})

export const group = (
  id: string,
  groupType: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  parentId?: string,
): GroupNode =>
  ({
    id,
    type: 'awsGroup',
    position: { x, y },
    width,
    height,
    ...(parentId && { parentId }),
    data: { label, groupType },
  }) as GroupNode

export const edge = (id: string, source: string, target: string, data: Partial<AppEdge['data']> = {}): AppEdge => ({
  id,
  type: 'aws',
  source,
  target,
  data: { label: '', dashed: false, pathType: 'step', arrows: 'end', ...data },
})

/** ALB -> two EC2 instances in private subnets -> RDS, inside a VPC. */
export const sampleNodes: AppNode[] = [
  group('vpc', 'vpc', 'Production VPC', 0, 0, 880, 520),
  group('subA', 'private-subnet', 'Private subnet A', 296, 56, 256, 184, 'vpc'),
  group('subB', 'private-subnet', 'Private subnet B', 296, 288, 256, 184, 'vpc'),
  icon('alb', 'ALB', ICONS.alb, 64, 200, 'vpc'),
  icon('web1', 'Web server 1', ICONS.ec2, 80, 56, 'subA'),
  icon('web2', 'Web server 2', ICONS.ec2, 80, 56, 'subB'),
  icon('rds', 'Orders DB', ICONS.rds, 672, 200, 'vpc'),
]

export const sampleEdges: AppEdge[] = [
  edge('e1', 'alb', 'web1', { label: 'HTTPS' }),
  edge('e2', 'alb', 'web2', { label: 'HTTPS' }),
  edge('e3', 'web1', 'rds', { label: 'SQL' }),
  edge('e4', 'web2', 'rds', { label: 'SQL', dashed: true }),
]

export const sampleInput: ExportInput = toExportInput('Web tier', sampleNodes, sampleEdges)

/** Everything an exporter must survive without failing. */
export const awkwardInput: ExportInput = toExportInput(
  'Edge "cases" [v2]\\n',
  [
    group('g1', 'vpc', 'Prod [eu-west-1]\nVPC', 0, 0, 600, 400),
    group('cycleA', 'generic', 'Cycle A', 700, 0, 200, 200, 'cycleB'),
    group('cycleB', 'generic', 'Cycle B', 0, 0, 200, 200, 'cycleA'),
    group('empty', 'nope-not-a-type', '', 1000, 0, 200, 200),
    icon('dup1', 'Worker', ICONS.lambda, 40, 80, 'g1'),
    icon('dup2', 'Worker', ICONS.lambda, 240, 80, 'g1'),
    icon('reserved1', 'lambda', ICONS.lambda, 40, 240, 'g1'),
    icon('reserved2', 'service', ICONS.appRunner, 240, 240, 'g1'),
    icon('unmapped', '', 'svc:Made-Up/Imaginary-Service', 400, 500),
    icon('orphan', 'Orphan', ICONS.ec2, 400, 700, 'does-not-exist'),
    icon('quotes', 'He said "hi" \\o/ Café ☕', ICONS.users, 600, 700),
    icon('digits', '123 start', ICONS.rds, 800, 700),
  ],
  [
    edge('toMissing', 'dup1', 'ghost', { label: 'lost' }),
    edge('toGroup', 'unmapped', 'g1', { label: 'GET [id]' }),
    edge('toEmptyGroup', 'orphan', 'empty'),
    edge('groupToChild', 'g1', 'dup1'),
    edge('both', 'dup1', 'dup2', { arrows: 'both', label: 'sync' }),
    edge('none', 'reserved1', 'reserved2', { arrows: 'none' }),
    edge('plainBoth', 'quotes', 'digits', { arrows: 'both' }),
    edge('plainNone', 'digits', 'orphan', { arrows: 'none', dashed: true }),
    edge('cycle', 'dup2', 'dup1'),
  ],
)

export const emptyInput: ExportInput = toExportInput('', [], [])
