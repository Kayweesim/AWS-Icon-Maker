// Diagram -> draw.io (.drawio) file: uncompressed mxGraph XML.
//
// Groups use draw.io's built-in AWS group shapes, so they stay native, editable containers.
// Service icons are the official AWS SVGs embedded as images, so they look identical and the
// file works offline.
import { groupStyle, type GroupType } from '../data/groups'
import { LABEL_WIDTH, TEXT_FONT_SIZE } from '../layout/config'
import { parseHandle } from '../layout/handles'
import { buildTree } from '../layout/shared'
import { iconNodeWidth, iconSizeOf, layoutSize } from '../layout/sizes'
import type { AppEdge, AppNode, IconNode } from '../types'

export type DrawioInput = { name: string; nodes: AppNode[]; edges: AppEdge[] }

/** Base64-encoded SVG for each icon path. Icons missing here export as a placeholder box. */
export type IconImages = Record<string, string>

/** Escapes text for an XML attribute. */
const attr = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\r?\n/g, '&#10;')

/** Labels use html=1, so they're HTML (then XML-escaped as an attribute). */
const htmlLabel = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>')

const style = (entries: Record<string, string | number | undefined>) =>
  Object.entries(entries)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(';') + ';'

const cellId = (id: string) => `c_${id}`

// draw.io's own AWS group icons (from its AWS 2019+ shape library). Groups without one there
// (Availability Zone, security group, generic) are drawn as plain styled containers.
const DRAWIO_GROUP_ICONS: Partial<Record<GroupType, string>> = {
  'aws-cloud': 'mxgraph.aws4.group_aws_cloud_alt',
  'region': 'mxgraph.aws4.group_region',
  'vpc': 'mxgraph.aws4.group_vpc2',
  'public-subnet': 'mxgraph.aws4.group_security_group',
  'private-subnet': 'mxgraph.aws4.group_security_group',
  'auto-scaling-group': 'mxgraph.aws4.group_auto_scaling_group',
  'aws-account': 'mxgraph.aws4.group_account',
  'corporate-data-center': 'mxgraph.aws4.group_corporate_data_center',
  'server-contents': 'mxgraph.aws4.group_on_premise',
  'ec2-instance-contents': 'mxgraph.aws4.group_ec2_instance_contents',
  'spot-fleet': 'mxgraph.aws4.group_spot_fleet',
}

const CONNECTION_POINTS = '[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]]'

function groupCellStyle(groupType: GroupType) {
  const look = groupStyle(groupType)
  const grIcon = DRAWIO_GROUP_ICONS[groupType]
  return style({
    ...(grIcon
      ? { points: CONNECTION_POINTS, outlineConnect: 0, gradientColor: 'none', shape: 'mxgraph.aws4.group', grIcon, spacingLeft: 30 }
      : { rounded: 0, spacingLeft: 8, spacingTop: 2 }),
    html: 1,
    whiteSpace: 'wrap',
    container: 1,
    collapsible: 0,
    recursiveResize: 0,
    pointerEvents: 0,
    verticalAlign: 'top',
    align: 'left',
    fontFamily: 'Arial',
    fontSize: 12,
    fontStyle: 0,
    strokeColor: look.stroke,
    fillColor: look.fill ?? 'none',
    fontColor: look.text,
    dashed: look.dashed ? 1 : 0,
  })
}

function iconCellStyle(node: IconNode, images: IconImages) {
  const label = { html: 1, whiteSpace: 'wrap', verticalLabelPosition: 'bottom', verticalAlign: 'top', labelWidth: LABEL_WIDTH, fontFamily: 'Arial', fontSize: 12 }
  const image = images[node.data.iconPath]
  if (!image) return style({ ...label, rounded: 1, fillColor: '#F5F5F5', strokeColor: '#9CA3AF' })
  // draw.io's convention for embedded images: base64 after "data:image/svg+xml," (no ";base64",
  // since ";" separates style entries).
  return style({ ...label, shape: 'image', aspect: 'fixed', imageAspect: 0, labelBackgroundColor: 'none', image: `data:image/svg+xml,${image}` })
}

/** Where an edge attaches: a point along a side, and for icons the bottom sits below the label. */
function attachment(prefix: 'exit' | 'entry', node: AppNode, handle: string | null | undefined) {
  const point = parseHandle(handle)
  if (!point) return {}
  const along = Math.round(point.fraction * 1000) / 1000
  const [x, y] =
    point.side === 'left' ? [0, along] : point.side === 'right' ? [1, along] : point.side === 'top' ? [along, 0] : [along, 1]
  const belowLabel = node.type === 'icon' && point.side === 'bottom' ? layoutSize(node).height - iconSizeOf(node) : 0
  return { [`${prefix}X`]: x, [`${prefix}Y`]: y, [`${prefix}Dx`]: 0, [`${prefix}Dy`]: belowLabel, [`${prefix}Perimeter`]: 0 }
}

function edgeCellStyle(edge: AppEdge, source: AppNode, target: AppNode) {
  const data = edge.data
  const arrows = data?.arrows ?? 'end'
  return style({
    html: 1,
    rounded: 1,
    ...(data?.pathType === 'straight' ? { edgeStyle: 'none' } : { edgeStyle: 'orthogonalEdgeStyle', curved: data?.pathType === 'bezier' ? 1 : undefined }),
    strokeColor: '#545B64',
    strokeWidth: 1.5,
    dashed: data?.dashed ? 1 : 0,
    endArrow: arrows === 'none' ? 'none' : 'open',
    endFill: 0,
    startArrow: arrows === 'both' ? 'open' : 'none',
    startFill: 0,
    fontFamily: 'Arial',
    fontSize: 11,
    labelBackgroundColor: '#FFFFFF',
    ...attachment('exit', source, edge.sourceHandle),
    ...attachment('entry', target, edge.targetHandle),
  })
}

const geometry = (x: number, y: number, width: number, height: number) =>
  `<mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(width)}" height="${Math.round(height)}" as="geometry" />`

export function exportDrawio({ name, nodes, edges }: DrawioInput, images: IconImages = {}): string {
  const tree = buildTree(nodes ?? [])
  // draw.io needs parents before children.
  const ordered = [...tree.byId.values()].sort((a, b) => tree.depthOf.get(a.id)! - tree.depthOf.get(b.id)!)

  const cells: string[] = []
  for (const node of ordered) {
    const parent = tree.parentOf.get(node.id)
    const parentId = parent ? cellId(parent) : '1'
    const x = node.position?.x ?? 0
    const y = node.position?.y ?? 0
    const size = layoutSize(node)
    const label = attr(htmlLabel(node.data?.label ?? ''))
    const open = `<mxCell id="${attr(cellId(node.id))}" value="${label}"`

    if (node.type === 'icon') {
      const iconSize = iconSizeOf(node)
      // The node box is at least label-wide with the icon centred; draw.io's shape is just the icon.
      const iconX = x + (iconNodeWidth(iconSize) - iconSize) / 2
      cells.push(`${open} style="${attr(iconCellStyle(node, images))}" vertex="1" parent="${attr(parentId)}">`, `  ${geometry(iconX, y, iconSize, iconSize)}`, '</mxCell>')
    } else if (node.type === 'text') {
      const fontSize = node.data?.fontSize ?? TEXT_FONT_SIZE
      const textStyle = style({ text: undefined, html: 1, whiteSpace: 'wrap', align: 'left', verticalAlign: 'top', fontFamily: 'Arial', fontSize, spacing: 2 })
      cells.push(`${open} style="text;${attr(textStyle)}" vertex="1" parent="${attr(parentId)}">`, `  ${geometry(x, y, size.width, size.height)}`, '</mxCell>')
    } else {
      cells.push(`${open} style="${attr(groupCellStyle(node.data?.groupType))}" vertex="1" parent="${attr(parentId)}">`, `  ${geometry(x, y, size.width, size.height)}`, '</mxCell>')
    }
  }

  for (const edge of edges ?? []) {
    const source = tree.byId.get(edge.source)
    const target = tree.byId.get(edge.target)
    // Arrows need both ends; anything else is left out rather than breaking the file.
    if (!source || !target || !edge.id) continue
    cells.push(
      `<mxCell id="${attr(cellId(edge.id))}" value="${attr(htmlLabel(edge.data?.label ?? ''))}" style="${attr(edgeCellStyle(edge, source, target))}" edge="1" parent="1" source="${attr(cellId(source.id))}" target="${attr(cellId(target.id))}">`,
      '  <mxGeometry relative="1" as="geometry" />',
      '</mxCell>',
    )
  }

  const indent = (lines: string[], spaces: number) => lines.map((line) => ' '.repeat(spaces) + line)
  return [
    '<mxfile host="AWS Diagram Studio" type="device">',
    `  <diagram id="aws-diagram" name="${attr(name || 'Untitled diagram')}">`,
    '    <mxGraphModel grid="1" gridSize="8" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">',
    '      <root>',
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    ...indent(cells, 8),
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
    '',
  ].join('\n')
}
