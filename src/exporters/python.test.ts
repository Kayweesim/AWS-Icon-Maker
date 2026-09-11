import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { awkwardInput, emptyInput, sampleInput } from './__fixtures__/diagrams'
import { exportPython } from './python'

describe('exportPython', () => {
  it('imports the official AWS node classes', () => {
    const output = exportPython(sampleInput)
    expect(output).toContain('from diagrams import Cluster, Diagram, Edge\n')
    expect(output).toContain('from diagrams.aws.compute import EC2\n')
    expect(output).toContain('from diagrams.aws.database import RDS\n')
    expect(output).toContain('from diagrams.aws.network import ALB\n')
    expect(output).toContain('with Diagram("Web tier", filename="web_tier", show=False, direction="LR"):\n')
  })

  it('nests groups as clusters and keeps edge labels and styles', () => {
    const output = exportPython(sampleInput)
    expect(output).toContain(
      '    with Cluster("Production VPC", graph_attr={"bgcolor": "transparent", "pencolor": "#8C4FFF", "fontcolor": "#6B3FD1"}):\n' +
        '        with Cluster("Private subnet A", graph_attr={"bgcolor": "#E6F6F7", "pencolor": "#00A4A6", "fontcolor": "#007C7E"}):\n' +
        '            web_server_1 = EC2("Web server 1")\n',
    )
    expect(output).toContain('        alb = ALB("ALB")\n')
    expect(output).toContain('    alb >> Edge(label="HTTPS") >> web_server_1\n')
    expect(output).toContain('    web_server_2 >> Edge(label="SQL", style="dashed") >> orders_db\n')
    expect(output).not.toContain('TODO')
  })

  it('never fails on awkward input', () => {
    const output = exportPython(awkwardInput)
    expect(output).toContain('# TODO: unmapped Imaginary Service\n    imaginary_service = General("Imaginary Service")')
    expect(output).toContain('from diagrams.aws.general import General, Users\n')
    expect(output).toContain('lambda_2 = Lambda("lambda")')
    expect(output).toContain('worker_2 = Lambda("Worker")')
    expect(output).toContain('he_said_hi_o_cafe = Users("He said \\"hi\\" \\\\o/ Café ☕")')
    expect(output).toContain('worker - Edge(label="sync", forward=True, reverse=True) - worker_2')
    expect(output).toContain('lambda_2 - service')
    expect(output).toContain('n_123_start - Edge(style="dashed") - orphan')
    expect(output).toContain('# Connected to the "Prod (eu-west-1) VPC" group'.replace('(eu-west-1)', '[eu-west-1]'))
    expect(output).toContain('# Skipped connection "lost": one end is missing')
    expect(output).toContain('    # Note (in Prod [eu-west-1] VPC): Remember: rotate keys quarterly\n')
    expect(output).toContain('# Skipped connection "see": it connects to a text note')
    expect(output).toContain('with Cluster("Group", graph_attr=')
  })

  it('handles an empty diagram', () => {
    expect(exportPython(emptyInput)).toContain('with Diagram("Untitled diagram", filename="untitled_diagram", show=False, direction="LR"):\n    pass')
  })
})

// Running the scripts needs Python with `diagrams` and Graphviz. Point DIAGRAMS_PYTHON at an interpreter that has them.
const PYTHON = process.env.DIAGRAMS_PYTHON ?? 'python3'
const canRun =
  spawnSync(PYTHON, ['-c', 'import diagrams'], { stdio: 'ignore' }).status === 0 &&
  spawnSync('dot', ['-V'], { stdio: 'ignore' }).status === 0

function runScript(script: string, fileName: string) {
  const dir = mkdtempSync(join(tmpdir(), 'diagrams-'))
  const path = join(dir, `${fileName}.py`)
  writeFileSync(path, script)
  const result = spawnSync(PYTHON, [path], { cwd: dir, encoding: 'utf8' })
  return { dir, result }
}

describe.runIf(canRun)('generated Python script', () => {
  it('runs and renders a PNG with the diagrams library', () => {
    const { dir, result } = runScript(exportPython(sampleInput), 'web_tier')
    expect(result.status, result.stderr).toBe(0)
    expect(existsSync(join(dir, 'web_tier.png'))).toBe(true)
  }, 60_000)

  it('produces the expected Graphviz graph', () => {
    const script = exportPython(awkwardInput).replace('show=False', 'show=False, outformat="dot"')
    const { dir, result } = runScript(script, 'awkward')
    expect(result.status, result.stderr).toBe(0)
    const dot = readFileSync(join(dir, 'edge_cases_v2_n.dot'), 'utf8')
    expect(dot).toContain('label=sync')
    expect(dot).toContain('dir=both')
    expect(dot).toContain('style=dashed')
    expect(dot).toContain('label="Prod [eu-west-1] VPC"')
  }, 60_000)
})
