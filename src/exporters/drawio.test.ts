import { describe, expect, it } from 'vitest'
import type { AppEdge, AppNode } from '../types'
import { sampleEdges, sampleNodes } from './__fixtures__/diagrams'
import { exportDrawio } from './drawio'

/** Minimal well-formedness check: balanced tags and quoted attributes, no stray "<" or "&". */
function assertWellFormedXml(text: string) {
  const stack: string[] = []
  const tag = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g
  let last = 0
  for (let match = tag.exec(text); match; match = tag.exec(text)) {
    const between = text.slice(last, match.index)
    if (/[<>]/.test(between) || /&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(between)) throw new Error(`Bad text near ${match.index}`)
    const [, closing, name, attributes, selfClosing] = match
    if (/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(attributes)) throw new Error(`Unescaped & in <${name}>`)
    if (closing) {
      if (stack.pop() !== name) throw new Error(`Mismatched </${name}>`)
    } else if (!selfClosing) {
      stack.push(name)
    }
    last = tag.lastIndex
  }
  if (text.slice(last).trim() || stack.length) throw new Error(`Unclosed: ${stack.join(', ')}`)
}

const cell = (xml: string, id: string) => xml.match(new RegExp(`<mxCell id="c_${id}"[^>]*>(\\s*<mxGeometry[^>]*>)?`))?.[0] ?? ''
const images = { '/aws-icons/x.svg': 'PHN2Zy8+' }

describe('exportDrawio', () => {
  const xml = exportDrawio({ name: 'Web tier', nodes: sampleNodes, edges: sampleEdges }, images)

  it('writes a well-formed draw.io file with the root cells', () => {
    assertWellFormedXml(xml)
    expect(xml).toMatch(/^<mxfile host="AWS Diagram Studio"/)
    expect(xml).toContain('<diagram id="aws-diagram" name="Web tier">')
    expect(xml).toContain('<mxCell id="0" />')
    expect(xml).toContain('<mxCell id="1" parent="0" />')
  })

  it('uses draw.io AWS group shapes and keeps nesting', () => {
    expect(cell(xml, 'vpc')).toContain('grIcon=mxgraph.aws4.group_vpc2')
    expect(cell(xml, 'vpc')).toContain('shape=mxgraph.aws4.group')
    expect(cell(xml, 'vpc')).toContain('strokeColor=#8C4FFF')
    expect(cell(xml, 'vpc')).toContain('parent="1"')
    expect(cell(xml, 'subA')).toContain('parent="c_vpc"')
    expect(cell(xml, 'subA')).toContain('fillColor=#E6F6F7')
    expect(cell(xml, 'subA')).toContain('<mxGeometry x="296" y="56" width="256" height="184"')
  })

  it('embeds icons as images with the label below, centred like on the canvas', () => {
    const web = cell(xml, 'web1')
    expect(web).toContain('value="Web server 1"')
    expect(web).toContain('shape=image')
    expect(web).toContain('image=data:image/svg+xml,PHN2Zy8+')
    expect(web).toContain('verticalLabelPosition=bottom')
    expect(web).toContain('parent="c_subA"')
    // A 64px icon in a 96px-wide node starts 16px in.
    expect(web).toContain('<mxGeometry x="96" y="56" width="64" height="64"')
  })

  it('embeds user images with their canvas dimensions', () => {
    const nodes: AppNode[] = [
      {
        id: 'image',
        type: 'image',
        position: { x: 24, y: 40 },
        width: 320,
        height: 160,
        data: { label: 'architecture', src: 'data:image/png;base64,AAEC/w==' },
      },
    ]
    const out = exportDrawio({ name: 'Image', nodes, edges: [] })
    assertWellFormedXml(out)
    expect(cell(out, 'image')).toContain('shape=image')
    expect(cell(out, 'image')).toContain('image=data:image/png,AAEC/w==')
    expect(cell(out, 'image')).toContain('value="architecture"')
    expect(cell(out, 'image')).toContain('verticalLabelPosition=bottom')
    expect(cell(out, 'image')).toContain('<mxGeometry x="24" y="40" width="320" height="160"')
  })

  it('exports small image captions and attaches arrows below them without stretching the image', () => {
    const nodes: AppNode[] = [
      { id: 'logo', type: 'image', position: { x: 0, y: 0 }, width: 32, height: 16, data: { label: 'Git & hub\nLogo', src: 'data:image/png;base64,AAEC/w==' } },
      { id: 'target', type: 'image', position: { x: 200, y: 200 }, width: 100, height: 100, data: { label: '', src: 'data:image/png;base64,AAEC/w==' } },
    ]
    const edges: AppEdge[] = [{ id: 'flow', type: 'aws', source: 'logo', target: 'target', sourceHandle: 'bottom', targetHandle: 'top', data: { label: 'HTTPS\nAPI request', pathType: 'step', arrows: 'end', dashed: false } }]
    const out = exportDrawio({ name: 'Captions', nodes, edges })
    assertWellFormedXml(out)
    expect(cell(out, 'logo')).toContain('value="Git &amp;amp; hub&lt;br&gt;Logo"')
    expect(cell(out, 'logo')).toContain('<mxGeometry x="32" y="0" width="32" height="16"')
    expect(cell(out, 'flow')).toContain('exitDy=36')
    expect(cell(out, 'flow')).toContain('value="HTTPS&lt;br&gt;API request"')
  })

  it('keeps arrow labels, styles and connection sides', () => {
    const edges: AppEdge[] = [
      { id: 'both', type: 'aws', source: 'web1', target: 'rds', sourceHandle: 'right', targetHandle: 'left', data: { label: 'SQL', dashed: true, pathType: 'straight', arrows: 'both' } },
      { id: 'down', type: 'aws', source: 'web1', target: 'web2', sourceHandle: 'bottom', targetHandle: 'top', data: { label: '', dashed: false, pathType: 'step', arrows: 'none' } },
    ]
    const out = exportDrawio({ name: 'x', nodes: sampleNodes, edges })
    const both = cell(out, 'both')
    expect(both).toContain('source="c_web1" target="c_rds"')
    expect(both).toContain('value="SQL"')
    expect(both).toContain('dashed=1')
    expect(both).toContain('edgeStyle=none')
    expect(both).toContain('startArrow=open')
    expect(both).toContain('endArrow=open')
    expect(both).toContain('exitX=1;exitY=0.5')
    expect(both).toContain('entryX=0;entryY=0.5')
    const point: AppEdge[] = [
      { id: 'point', type: 'aws', source: 'vpc', target: 'rds', sourceHandle: 'right-25', targetHandle: 'top-75', data: { label: '', dashed: false, pathType: 'step', arrows: 'end' } },
    ]
    // A hand-picked connection point keeps its exact place on the side.
    expect(cell(exportDrawio({ name: 'x', nodes: sampleNodes, edges: point }), 'point')).toContain('exitX=1;exitY=0.25')
    expect(cell(exportDrawio({ name: 'x', nodes: sampleNodes, edges: point }), 'point')).toContain('entryX=0.75;entryY=0')

    const down = cell(out, 'down')
    expect(down).toContain('endArrow=none')
    expect(down).toContain('edgeStyle=orthogonalEdgeStyle')
    // Leaves from under the label rather than through it.
    expect(down).toMatch(/exitX=0\.5;exitY=1;exitDx=0;exitDy=[1-9]\d*/)
  })

  it('never breaks the file on awkward content', () => {
    const nodes: AppNode[] = [
      { id: 'g', type: 'awsGroup', position: { x: 0, y: 0 }, width: 300, height: 200, data: { label: 'Prod <eu> & "friends"', groupType: 'security-group' } },
      { id: 'missing', type: 'icon', position: { x: 20, y: 60 }, parentId: 'g', data: { label: 'No image\nsecond line', iconId: 'svc:Made-Up/X', iconPath: '/aws-icons/none.svg' } },
      { id: 'orphan', type: 'icon', position: { x: 500, y: 60 }, parentId: 'nowhere', data: { label: 'Orphan', iconId: 'x', iconPath: '/aws-icons/x.svg', iconSize: 48 } },
      { id: 'note', type: 'text', position: { x: 10, y: 250 }, data: { label: 'Note: a < b\nline 2', fontSize: 18 } },
    ]
    const edges: AppEdge[] = [
      { id: 'ghost', type: 'aws', source: 'missing', target: 'nobody', data: { label: 'lost', dashed: false, pathType: 'step', arrows: 'end' } },
    ]
    const out = exportDrawio({ name: 'A & B', nodes, edges }, images)
    assertWellFormedXml(out)
    expect(cell(out, 'g')).toContain('value="Prod &amp;lt;eu&amp;gt; &amp;amp; &quot;friends&quot;"')
    expect(cell(out, 'g')).toContain('rounded=0')
    expect(cell(out, 'missing')).toContain('value="No image&lt;br&gt;second line"')
    expect(cell(out, 'missing')).toContain('fillColor=#F5F5F5')
    expect(cell(out, 'orphan')).toContain('parent="1"')
    expect(cell(out, 'note')).toContain('style="text;')
    expect(cell(out, 'note')).toContain('fontSize=18')
    expect(out).not.toContain('c_ghost')
  })

  it('handles an empty diagram', () => {
    const out = exportDrawio({ name: '', nodes: [], edges: [] })
    assertWellFormedXml(out)
    expect(out).toContain('name="Untitled diagram"')
  })

  it('exports arrow thickness/colour and independent bold/underline/colour on every label type', () => {
    const formatting = { bold: true, underline: true, textColor: '#2563eb' }
    const nodes: AppNode[] = [
      { id: 'group', type: 'awsGroup', position: { x: 0, y: 0 }, width: 500, height: 500, data: { label: 'Group', groupType: 'vpc', ...formatting } },
      { id: 'icon', type: 'icon', position: { x: 20, y: 20 }, data: { label: 'Service', iconId: 'x', iconPath: '/aws-icons/x.svg', ...formatting } },
      { id: 'text', type: 'text', position: { x: 100, y: 20 }, data: { label: 'Text', ...formatting } },
      { id: 'image', type: 'image', position: { x: 200, y: 20 }, width: 100, height: 50, data: { label: 'Image', src: 'data:image/png;base64,AAEC/w==', ...formatting } },
    ]
    const edges: AppEdge[] = [{ id: 'arrow', type: 'aws', source: 'icon', target: 'text', data: { label: 'HTTPS', pathType: 'straight', arrows: 'both', dashed: false, strokeColor: '#dc2626', strokeWidth: 4.5, ...formatting } }]
    const out = exportDrawio({ name: 'Styles', nodes, edges }, images)
    assertWellFormedXml(out)
    for (const id of ['group', 'icon', 'text', 'image', 'arrow']) {
      expect(cell(out, id)).toContain('fontColor=#2563eb')
      expect(cell(out, id)).toContain('fontStyle=5')
    }
    expect(cell(out, 'arrow')).toContain('strokeColor=#dc2626')
    expect(cell(out, 'arrow')).toContain('strokeWidth=4.5')
    expect(cell(out, 'group')).toContain('strokeColor=#8C4FFF')
    expect(cell(out, 'image')).toContain('width="100" height="50"')
    const underlined = exportDrawio({ name: 'Underline', nodes: [{ ...nodes[2], data: { ...nodes[2].data, bold: false } } as AppNode], edges: [] })
    expect(cell(underlined, 'text')).toContain('fontStyle=4')
  })

  it('exports adjusted elbow waypoints in absolute diagram coordinates', () => {
    const nodes: AppNode[] = [
      { id: 'a', type: 'image', position: { x: 0, y: 0 }, width: 100, height: 100, data: { label: 'a', src: 'data:image/png;base64,AAEC/w==' } },
      { id: 'b', type: 'image', position: { x: 400, y: 200 }, width: 100, height: 100, data: { label: 'b', src: 'data:image/png;base64,AAEC/w==' } },
    ]
    const edges: AppEdge[] = [{ id: 'ab', type: 'aws', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left', data: { label: '', pathType: 'step', arrows: 'end', dashed: false, elbowOffsets: [40] } }]
    const out = exportDrawio({ name: 'Elbows', nodes, edges })
    assertWellFormedXml(out)
    expect(out).toContain('<Array as="points"><mxPoint x="290" y="50" /><mxPoint x="290" y="250" /></Array>')
  })

  it('exports extra endpoint bends even without an interior offset', () => {
    const nodes: AppNode[] = [
      { id: 'a', type: 'image', position: { x: 0, y: 0 }, width: 100, height: 100, data: { label: '', src: 'data:image/png;base64,AAEC/w==' } },
      { id: 'b', type: 'image', position: { x: 400, y: 400 }, width: 100, height: 100, data: { label: '', src: 'data:image/png;base64,AAEC/w==' } },
    ]
    const edges: AppEdge[] = [{ id: 'ab', type: 'aws', source: 'a', target: 'b', sourceHandle: 'bottom', targetHandle: 'top', data: { label: '', pathType: 'step', arrows: 'end', dashed: false, elbowEndpointOffsets: { target: -80 } } }]
    const out = exportDrawio({ name: 'Endpoint bends', nodes, edges })
    assertWellFormedXml(out)
    expect(out).toContain('<mxPoint x="370" y="380" /><mxPoint x="450" y="380" />')
  })
})
