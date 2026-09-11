import { groupIconPaths } from './icons'

export type GroupStyle = {
  label: string
  stroke: string
  /** Label text colour. */
  text: string
  fill?: string
  dashed: boolean
  /** Group icon file stem from the asset package, drawn in the top-left corner. */
  icon?: string
  width: number
  height: number
}

// Colours follow the AWS Architecture Icons deck and group SVGs.
export const GROUP_STYLES = {
  'aws-cloud': { label: 'AWS Cloud', stroke: '#232F3E', text: '#232F3E', dashed: false, icon: 'AWS-Cloud-logo', width: 640, height: 420 },
  'region': { label: 'Region', stroke: '#00A4A6', text: '#007C7E', dashed: true, icon: 'Region', width: 560, height: 360 },
  'availability-zone': { label: 'Availability Zone', stroke: '#147EBA', text: '#147EBA', dashed: true, width: 280, height: 300 },
  'vpc': { label: 'VPC', stroke: '#8C4FFF', text: '#6B3FD1', dashed: false, icon: 'Virtual-private-cloud-VPC', width: 480, height: 320 },
  'public-subnet': { label: 'Public subnet', stroke: '#7AA116', text: '#248814', fill: '#F2F6E8', dashed: false, icon: 'Public-subnet', width: 240, height: 180 },
  'private-subnet': { label: 'Private subnet', stroke: '#00A4A6', text: '#007C7E', fill: '#E6F6F7', dashed: false, icon: 'Private-subnet', width: 240, height: 180 },
  'security-group': { label: 'Security group', stroke: '#DD3522', text: '#DD3522', dashed: false, width: 200, height: 140 },
  'auto-scaling-group': { label: 'Auto Scaling group', stroke: '#ED7100', text: '#D05C00', dashed: true, icon: 'Auto-Scaling-group', width: 280, height: 160 },
  'aws-account': { label: 'AWS account', stroke: '#E7157B', text: '#C7106A', dashed: false, icon: 'AWS-Account', width: 560, height: 360 },
  'corporate-data-center': { label: 'Corporate data center', stroke: '#7D8998', text: '#5A6C86', dashed: false, icon: 'Corporate-data-center', width: 280, height: 220 },
  'server-contents': { label: 'Server contents', stroke: '#7D8998', text: '#5A6C86', dashed: false, icon: 'Server-contents', width: 240, height: 180 },
  'ec2-instance-contents': { label: 'EC2 instance contents', stroke: '#ED7100', text: '#D05C00', dashed: false, icon: 'EC2-instance-contents', width: 240, height: 180 },
  'spot-fleet': { label: 'Spot Fleet', stroke: '#ED7100', text: '#D05C00', dashed: false, icon: 'Spot-Fleet', width: 280, height: 160 },
  'generic': { label: 'Group', stroke: '#7D8998', text: '#5A6C86', dashed: true, width: 240, height: 180 },
} satisfies Record<string, GroupStyle>

export type GroupType = keyof typeof GROUP_STYLES

export const GROUP_TYPES = Object.keys(GROUP_STYLES) as GroupType[]

export function groupStyle(type: GroupType): GroupStyle {
  return GROUP_STYLES[type] ?? GROUP_STYLES.generic
}

export function groupIconPath(type: GroupType): string | undefined {
  const icon = groupStyle(type).icon
  return icon ? groupIconPaths[icon] : undefined
}
