import { DEFAULT_EDGE_DATA, useDiagramStore } from '../../store/diagramStore'
import type { AppEdge, AwsEdgeData } from '../../types'
import { Segmented, TextField } from './controls'

/** The shared value of a property across edges, or undefined if they differ. */
function common<K extends keyof AwsEdgeData>(edges: AppEdge[], key: K): AwsEdgeData[K] | undefined {
  const values = new Set(edges.map((e) => ({ ...DEFAULT_EDGE_DATA, ...e.data })[key]))
  return values.size === 1 ? [...values][0] : undefined
}

export function EdgeProperties({ edges }: { edges: AppEdge[] }) {
  const updateEdgesData = useDiagramStore((s) => s.updateEdgesData)
  const ids = edges.map((e) => e.id)
  const update = (patch: Partial<AwsEdgeData>) => updateEdgesData(ids, patch)
  const dashed = common(edges, 'dashed')

  return (
    <>
      {edges.length === 1 && (
        <TextField
          key={edges[0].id}
          label="Label"
          placeholder="Add a label"
          value={edges[0].data?.label ?? ''}
          onCommit={(label) => update({ label })}
        />
      )}
      <Segmented
        label="Line"
        value={dashed === undefined ? undefined : dashed ? 'dashed' : 'solid'}
        options={[
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
        ]}
        onChange={(v) => update({ dashed: v === 'dashed' })}
      />
      <Segmented
        label="Path"
        value={common(edges, 'pathType')}
        options={[
          { value: 'step', label: 'Elbow' },
          { value: 'straight', label: 'Straight' },
          { value: 'bezier', label: 'Curved' },
        ]}
        onChange={(pathType) => update({ pathType })}
      />
      <Segmented
        label="Arrowheads"
        value={common(edges, 'arrows')}
        options={[
          { value: 'end', label: 'End' },
          { value: 'both', label: 'Both' },
          { value: 'none', label: 'None' },
        ]}
        onChange={(arrows) => update({ arrows })}
      />
    </>
  )
}
