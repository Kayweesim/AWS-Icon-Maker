import { DEFAULT_EDGE_DATA, useDiagramStore } from '../../store/diagramStore'
import type { AppEdge, AwsEdgeData } from '../../types'
import { ColorField, Field, NumberField, Segmented, TextField } from './controls'
import { arrowAppearance, MAX_ARROW_WIDTH, MIN_ARROW_WIDTH } from '../../lib/appearance'

/** The shared value of a property across edges, or undefined if they differ. */
function common<K extends keyof AwsEdgeData>(edges: AppEdge[], key: K): AwsEdgeData[K] | undefined {
  const values = new Set(edges.map((e) => ({ ...DEFAULT_EDGE_DATA, ...e.data })[key]))
  return values.size === 1 ? [...values][0] : undefined
}

export function EdgeProperties({ edges }: { edges: AppEdge[] }) {
  const updateEdgesData = useDiagramStore((s) => s.updateEdgesData)
  const routeEdges = useDiagramStore((s) => s.routeEdges)
  const ids = edges.map((e) => e.id)
  const update = (patch: Partial<AwsEdgeData>) => updateEdgesData(ids, patch)
  const dashed = common(edges, 'dashed')
  const colors = new Set(edges.map((edge) => arrowAppearance(edge.data).color))
  const widths = new Set(edges.map((edge) => arrowAppearance(edge.data).width))

  return (
    <>
      <ColorField key={`${ids.join(',')}-color`} label="Arrow colour" value={colors.size === 1 ? [...colors][0] : undefined} onCommit={(strokeColor) => update({ strokeColor })} />
      <NumberField key={`${ids.join(',')}-width`} label="Arrow thickness (px)" value={widths.size === 1 ? [...widths][0] : undefined} min={MIN_ARROW_WIDTH} max={MAX_ARROW_WIDTH} step={0.5} onCommit={(strokeWidth) => update({ strokeWidth })} />
      <button type="button" onClick={() => update({ strokeColor: undefined, strokeWidth: undefined })} className="h-8 shrink-0 rounded-md border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50">Reset arrow appearance</button>
      {edges.length === 1 && <>
        <TextField
          key={`${edges[0].id}-label`}
          label="Label"
          placeholder="Add a label"
          multiline
          value={edges[0].data?.label ?? ''}
          onCommit={(label) => update({ label })}
        />
        <p className="text-[12px] leading-snug text-zinc-500">Shown on the arrow. Shift+Enter adds a line.</p>
        <TextField
          key={`${edges[0].id}-description`}
          label="Description"
          placeholder="Add notes about this connection"
          multiline
          value={edges[0].data?.description ?? ''}
          onCommit={(description) => update({ description })}
        />
        <p className="text-[12px] leading-snug text-zinc-500">Notes for this connection, shown only in this sidebar.</p>
      </>}
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
        onChange={(pathType) => update({ pathType, elbowOffsets: undefined, elbowEndpointOffsets: undefined })}
      />
      {common(edges, 'pathType') === 'step' && (
        <Field label="Elbows">
          <div className="grid grid-cols-2 gap-1.5">
            {([
              ['top', '∩', 'Above'], ['bottom', '∪', 'Below'],
              ['left', '⊏', 'Left'], ['right', '⊐', 'Right'],
            ] as const).map(([side, shape, label]) => (
              <button
                key={side}
                type="button"
                aria-label={`Route ${label.toLowerCase()}`}
                onClick={() => routeEdges(ids, side)}
                className="flex h-8 items-center justify-center gap-2 rounded-md border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-blue-500"
              ><span aria-hidden="true" className="text-lg leading-none">{shape}</span>{label}</button>
            ))}
          </div>
          <span className="text-[12px] leading-snug text-zinc-500">Route around both nodes, then drag a blue handle to adjust the distance.</span>
          <span className="text-[12px] leading-snug text-zinc-500">Drag a handle near either end sideways to add bends while keeping the connection attached.</span>
          <button
            type="button"
            onClick={() => routeEdges(ids, 'auto')}
            className="h-8 rounded-md border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50"
          >Automatic route</button>
          <button
            type="button"
            onClick={() => update({ elbowOffsets: undefined, elbowEndpointOffsets: undefined })}
            disabled={!edges.some((edge) => edge.data?.elbowOffsets || edge.data?.elbowEndpointOffsets)}
            className="h-8 rounded-md border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >Reset elbows</button>
        </Field>
      )}
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
