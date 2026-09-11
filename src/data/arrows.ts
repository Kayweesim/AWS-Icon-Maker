import type { AwsEdgeData } from '../types'

export type ArrowPresetId = 'data-flow' | 'async' | 'two-way' | 'replication' | 'network' | 'monitoring'

export type ArrowPreset = {
  id: ArrowPresetId
  label: string
  description: string
  /** Extra search terms: services and concepts this kind of connection is used for. */
  keywords: string[]
  style: Pick<AwsEdgeData, 'dashed' | 'arrows'>
}

// Common connection types in AWS architecture diagrams. Solid lines are direct paths,
// dashed lines are indirect ones (asynchronous, replication, observability).
export const ARROW_PRESETS: ArrowPreset[] = [
  {
    id: 'data-flow',
    label: 'Data flow',
    description: 'Requests, API calls and data moving one way',
    keywords: ['request', 'call', 'http', 'https', 'api', 'traffic', 'synchronous', 'read', 'write', 'solid'],
    style: { dashed: false, arrows: 'end' },
  },
  {
    id: 'async',
    label: 'Async / event',
    description: 'Messages, events, queues and streams',
    keywords: ['event', 'message', 'queue', 'sqs', 'sns', 'eventbridge', 'kinesis', 'stream', 'publish', 'subscribe', 'trigger', 'dashed', 'dotted'],
    style: { dashed: true, arrows: 'end' },
  },
  {
    id: 'two-way',
    label: 'Two-way',
    description: 'Request and response, or links used in both directions',
    keywords: ['bidirectional', 'both', 'duplex', 'websocket', 'response', 'solid'],
    style: { dashed: false, arrows: 'both' },
  },
  {
    id: 'replication',
    label: 'Replication / backup',
    description: 'Replication, sync, backup and failover between resources',
    keywords: ['replica', 'replicate', 'sync', 'backup', 'failover', 'disaster recovery', 'multi-az', 'cross-region', 'dashed', 'dotted'],
    style: { dashed: true, arrows: 'both' },
  },
  {
    id: 'network',
    label: 'Network link',
    description: 'VPN, Direct Connect, peering and attachments',
    keywords: ['vpn', 'direct connect', 'peering', 'transit gateway', 'attachment', 'association', 'link', 'solid'],
    style: { dashed: false, arrows: 'none' },
  },
  {
    id: 'monitoring',
    label: 'Monitoring / logs',
    description: 'Logs, metrics, auditing and optional paths',
    keywords: ['logs', 'metrics', 'cloudwatch', 'cloudtrail', 'audit', 'observability', 'optional', 'dependency', 'dashed', 'dotted'],
    style: { dashed: true, arrows: 'none' },
  },
]

export const DEFAULT_ARROW_PRESET: ArrowPresetId = 'data-flow'

export const arrowPreset = (id: ArrowPresetId) => ARROW_PRESETS.find((preset) => preset.id === id) ?? ARROW_PRESETS[0]

export function filterArrowPresets(query: string): ArrowPreset[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return ARROW_PRESETS
  return ARROW_PRESETS.filter((preset) => {
    const haystack = `arrow line connector connection ${preset.label} ${preset.description} ${preset.keywords.join(' ')}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
