import type { GroupType } from '../../data/groups'
import type { AppEdge, AppNode } from '../../types'

const icon = (id: string, label: string, x: number, y: number, iconSize: number, parentId?: string): AppNode => ({
  id,
  type: 'icon',
  position: { x, y },
  ...(parentId && { parentId }),
  data: { label, iconId: 'svc:Compute/Amazon-EC2', iconPath: '/aws-icons/services/Compute/Arch_Amazon-EC2_48.svg', iconSize },
})

const group = (
  id: string,
  groupType: GroupType,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  parentId?: string,
): AppNode => ({ id, type: 'awsGroup', position: { x, y }, width, height, ...(parentId && { parentId }), data: { label, groupType } })

/**
 * A deliberately messy diagram: off-grid positions, mixed icon sizes, overlapping nodes,
 * a node overlapping a subnet border, and a VPC with two subnets.
 */
export const messyNodes: AppNode[] = [
  group('vpc', 'vpc', 'VPC', 103, 61, 690, 470),
  group('subA', 'private-subnet', 'Private subnet A', 29, 67, 250, 330, 'vpc'),
  group('subB', 'private-subnet', 'Private subnet B', 318, 71, 330, 250, 'vpc'),
  icon('alb', 'ALB', -150, 213, 48),
  icon('cw', 'CloudWatch', -143, 211, 64),
  icon('web1', 'Web 1', 45, 83, 32, 'subA'),
  icon('web2', 'Web 2', 51, 211, 48, 'subA'),
  icon('fn', 'Lambda', 37, 69, 64, 'subB'),
  icon('ddb', 'DynamoDB', 81, 93, 48, 'subB'),
  icon('rds', 'Orders database', 455, 300, 64, 'vpc'),
]

const edge = (id: string, source: string, target: string, label = ''): AppEdge => ({
  id,
  type: 'aws',
  source,
  target,
  sourceHandle: 'bottom',
  targetHandle: 'top',
  data: { label, dashed: false, pathType: 'step', arrows: 'end' },
})

export const messyEdges: AppEdge[] = [
  edge('e1', 'alb', 'web1', 'HTTPS'),
  edge('e2', 'alb', 'web2', 'HTTPS'),
  edge('e3', 'web1', 'rds'),
  edge('e4', 'web2', 'rds'),
  edge('e5', 'fn', 'ddb'),
]
