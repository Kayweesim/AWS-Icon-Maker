import { GROUP_TYPES, groupStyle, type GroupType } from '../../data/groups'
import { ICON_SIZES } from '../../layout/config'
import { iconSizeOf } from '../../layout/sizes'
import { useDiagramStore } from '../../store/diagramStore'
import type { GroupNode, IconNode } from '../../types'
import { Field, Segmented, SelectField, TextField } from './controls'

const groupOptions = GROUP_TYPES.map((type) => ({ value: type, label: groupStyle(type).label }))
const sizeOptions = ICON_SIZES.map((size) => ({ value: String(size), label: `${size}px` }))

export function IconSizeField({ nodes }: { nodes: IconNode[] }) {
  const setIconSize = useDiagramStore((s) => s.setIconSize)
  const sizes = new Set(nodes.map(iconSizeOf))

  return (
    <Segmented
      label="Icon size"
      value={sizes.size === 1 ? String([...sizes][0]) : undefined}
      options={sizeOptions}
      onChange={(size) => setIconSize(nodes.map((n) => n.id), Number(size))}
    />
  )
}

export function IconProperties({ node }: { node: IconNode }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-2.5">
        <img src={node.data.iconPath} alt="" width={32} height={32} className="h-8 w-8" />
        <span className="text-[12px] leading-tight text-zinc-500">
          {node.data.iconId.replace(/^(svc|res):[^/]*\//, '').replace(/[-_]/g, ' ')}
        </span>
      </div>
      <TextField key={node.id} label="Label" value={node.data.label} onCommit={(label) => updateNodeData(node.id, { label })} />
      <IconSizeField nodes={[node]} />
    </>
  )
}

export function GroupProperties({ node }: { node: GroupNode }) {
  const updateNodeData = useDiagramStore((s) => s.updateNodeData)
  const style = groupStyle(node.data.groupType)

  const changeType = (groupType: GroupType) => {
    // Keep custom names; replace the default name with the new type's name.
    const label = node.data.label === style.label ? groupStyle(groupType).label : node.data.label
    updateNodeData(node.id, { groupType, label })
  }

  return (
    <>
      <TextField key={node.id} label="Label" value={node.data.label} onCommit={(label) => updateNodeData(node.id, { label })} />
      <SelectField label="Group type" value={node.data.groupType} options={groupOptions} onChange={changeType} />
      <Field label="Size">
        <span className="text-[12px] text-zinc-600 tabular-nums">
          {Math.round(node.width ?? style.width)} × {Math.round(node.height ?? style.height)}
        </span>
      </Field>
    </>
  )
}
