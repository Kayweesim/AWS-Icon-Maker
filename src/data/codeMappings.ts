import data from './code-mappings.json'

export type CodeMapping = {
  /** Canonical AWS name, e.g. "Amazon EC2" or "Amazon Simple Queue Service Queue". */
  label: string
  /** iconify "logos:aws-*" name or a Mermaid built-in icon. */
  mermaidIcon?: string
  /** Fully qualified class, e.g. "diagrams.aws.compute.EC2". */
  diagramsClass?: string
  /** hashicorp/aws resource type, e.g. "aws_instance". */
  terraformType?: string
}

const mappings = data.mappings as Record<string, CodeMapping>

export function codeMappingFor(iconId: string | undefined): CodeMapping | undefined {
  return iconId ? mappings[iconId] : undefined
}
