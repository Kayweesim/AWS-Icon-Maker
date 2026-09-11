import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import mappings from '../data/code-mappings.json'
import { awkwardInput, emptyInput, group, icon, sampleInput } from './__fixtures__/diagrams'
import { toExportInput, type ExportInput } from './model'
import { exportTerraform } from './terraform'

describe('exportTerraform', () => {
  it('emits one resource block per mapped node', () => {
    const output = exportTerraform(sampleInput)
    expect(output).toContain('resource "aws_vpc" "production_vpc" {')
    expect(output).toContain('resource "aws_subnet" "private_subnet_a" {')
    expect(output).toContain('resource "aws_lb" "alb" {')
    expect(output).toContain('resource "aws_instance" "web_server_1" {')
    expect(output).toContain('resource "aws_db_instance" "orders_db" {')
    expect(output.match(/^resource /gm)).toHaveLength(7)
  })

  it('uses placeholder values and keeps the diagram structure', () => {
    const output = exportTerraform(sampleInput)
    expect(output).toContain('  ami           = "ami-00000000000000000"\n  instance_type = "t3.micro"\n')
    expect(output).toMatch(/ {2}vpc_id += aws_vpc\.production_vpc\.id\n/)
    expect(output).toContain('# Web server 1 (Amazon EC2), in Private subnet A\n# TODO: place it in aws_subnet.private_subnet_a')
    expect(output).toContain('    Name = "Web server 1"\n')
  })

  it('lists connections as comments without inferring networking or IAM', () => {
    const output = exportTerraform(sampleInput)
    expect(output).toContain('#   aws_lb.alb -> aws_instance.web_server_1 (HTTPS)\n')
    expect(output).toContain('#   aws_instance.web_server_2 -> aws_db_instance.orders_db (SQL)\n')
    expect(output).not.toMatch(/aws_security_group_rule|aws_iam_policy|ingress|egress/)
  })

  it('never fails on awkward input', () => {
    const output = exportTerraform(awkwardInput)
    expect(output).toContain(
      '# TODO: unmapped Imaginary Service ("Imaginary Service"): no Terraform resource type is known\n# resource "TODO" "imaginary_service" {}',
    )
    expect(output).toContain('# Cycle A (Group): grouping only, no resource')
    expect(output).toContain('resource "aws_lambda_function" "worker_2" {')
    expect(output).toContain('#   skipped "lost": one end is missing')
  })

  it('escapes template sequences in labels and picks up the region from a Region group', () => {
    const input = toExportInput(
      'x',
      [
        group('r', 'region', 'eu-west-2', 0, 0, 400, 400),
        icon('b', 'Logs ${var.env} %{if x}', 'svc:Storage/Amazon-Simple-Storage-Service', 40, 80, 'r'),
      ],
      [],
    )
    const output = exportTerraform(input)
    expect(output).toContain('  region = "eu-west-2"')
    expect(output).toContain('Name = "Logs $${var.env} %%{if x}"')
  })

  it('handles an empty diagram', () => {
    const output = exportTerraform(emptyInput)
    expect(output).toContain('provider "aws" {')
    expect(output).toContain('# The diagram is empty')
  })
})

// `terraform validate` needs Terraform and a local copy of the hashicorp/aws provider:
// TERRAFORM_PLUGIN_DIR=<a .terraform/providers directory>.
const PLUGIN_DIR = process.env.TERRAFORM_PLUGIN_DIR
const canValidate = !!PLUGIN_DIR && spawnSync('terraform', ['version'], { stdio: 'ignore' }).status === 0

/** A diagram with every mapped resource type, inside a VPC and subnet. */
function kitchenSink(): ExportInput {
  const iconIds = Object.entries(mappings.mappings as Record<string, { terraformType?: string }>)
    .filter(([, mapping]) => mapping.terraformType)
    .map(([id]) => id)
  return toExportInput(
    'Kitchen sink',
    [
      group('vpc', 'vpc', 'VPC', 0, 0, 4000, 4000),
      group('sub', 'public-subnet', 'Public subnet', 40, 80, 3800, 3800, 'vpc'),
      group('sg', 'security-group', 'Web SG', 40, 80, 400, 400, 'sub'),
      group('asg', 'auto-scaling-group', 'Web ASG', 500, 80, 400, 400, 'sub'),
      ...iconIds.map((id, i) => icon(`n${i}`, `Service ${i}`, id, 40 + (i % 20) * 120, 600 + Math.floor(i / 20) * 120, 'sub')),
    ],
    [],
  )
}

function terraform(dir: string, ...args: string[]) {
  return spawnSync('terraform', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, TF_IN_AUTOMATION: '1' } })
}

function validate(input: ExportInput) {
  const dir = mkdtempSync(join(tmpdir(), 'tf-scaffold-'))
  writeFileSync(join(dir, 'main.tf'), exportTerraform(input))
  const init = terraform(dir, 'init', '-backend=false', '-input=false', '-no-color', `-plugin-dir=${PLUGIN_DIR}`)
  expect(init.status, init.stderr + init.stdout).toBe(0)
  const result = terraform(dir, 'validate', '-no-color')
  expect(result.status, result.stderr + result.stdout).toBe(0)
  const fmt = terraform(dir, 'fmt', '-check', '-diff', '-no-color')
  expect(fmt.status, fmt.stdout + fmt.stderr).toBe(0)
}

describe.runIf(canValidate)('generated Terraform', () => {
  it('passes terraform validate and fmt for the sample diagram', () => validate(sampleInput), 120_000)
  it('passes terraform validate and fmt for every mapped resource type', () => validate(kitchenSink()), 120_000)
  it('passes terraform validate and fmt for awkward input', () => validate(awkwardInput), 120_000)
})
