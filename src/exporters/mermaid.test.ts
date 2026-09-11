import { parse } from '@mermaid-js/parser'
import { describe, expect, it } from 'vitest'
import { awkwardInput, emptyInput, sampleInput } from './__fixtures__/diagrams'
import { exportMermaid } from './mermaid'

const parseArchitecture = (text: string) => parse('architecture', text)

describe('exportMermaid', () => {
  it('exports nested groups, services and labelled edges', async () => {
    const output = exportMermaid(sampleInput)
    expect(output.startsWith('architecture-beta\n')).toBe(true)
    expect(output).toContain('group production_vpc(cloud)[Production VPC]\n')
    expect(output).toContain('group private_subnet_a(cloud)[Private subnet A] in production_vpc\n')
    expect(output).toContain('service web_server_1(server)[Web server 1] in private_subnet_a\n')
    expect(output).toContain('service alb(internet)[ALB] in production_vpc\n')
    expect(output).toContain('service orders_db(database)[Orders DB] in production_vpc\n')
    expect(output).not.toContain('TODO')

    const ast = await parseArchitecture(output)
    expect(ast.groups).toHaveLength(3)
    expect(ast.services).toHaveLength(4)
    expect(ast.edges).toHaveLength(4)
  })

  it('picks edge sides from the drawn layout, using corners for diagonal connections', () => {
    const output = exportMermaid(sampleInput)
    // Web server 1 is almost level with the ALB; web server 2 is well below it.
    expect(output).toContain('alb:R -[HTTPS]-> L:web_server_1\n')
    expect(output).toContain('alb:B -[HTTPS]-> L:web_server_2\n')
    expect(output).toContain('web_server_1:R -[SQL]-> L:orders_db\n')
    expect(output).toContain('web_server_2:T -[SQL]-> L:orders_db\n')
  })

  it('uses AWS logos from the iconify pack when requested', async () => {
    const output = exportMermaid(sampleInput, { iconSet: 'aws' })
    expect(output).toContain('group production_vpc(logos:aws-vpc)[Production VPC]')
    expect(output).toContain('service alb(logos:aws-elb)[ALB] in production_vpc')
    expect(output).toContain('service web_server_1(logos:aws-ec2)[Web server 1]')
    expect(output).toContain('service orders_db(logos:aws-rds)[Orders DB]')
    await expect(parseArchitecture(output)).resolves.toBeTruthy()
  })

  it('marks unmapped services with a TODO and falls back to a generic icon', () => {
    const output = exportMermaid(awkwardInput, { iconSet: 'aws' })
    expect(output).toContain('%% TODO: unmapped Imaginary Service\n    service imaginary_service(server)[Imaginary Service]')
    expect(output).toContain('%% TODO: unmapped AWS App Runner')
  })

  it('never fails on awkward input, and the output still parses', async () => {
    for (const iconSet of ['builtin', 'aws'] as const) {
      const output = exportMermaid(awkwardInput, { iconSet })
      expect(output).toContain('group prod_eu_west_1_vpc(')
      expect(output).toContain('[Prod (eu-west-1) VPC]')
      expect(output).toContain('service worker(')
      expect(output).toContain('service worker_2(')
      expect(output).toContain('service service_2(')
      expect(output).toContain('service n_123_start(')
      expect(output).toContain('worker:R <-[sync]-> L:worker_2')
      expect(output).toContain('imaginary_service:L -[GET (id)]-> B:worker{group}')
      expect(output).toContain('%% Skipped connection "lost": one end is missing')
      expect(output).toContain('%% Note (in Prod (eu-west-1) VPC): Remember: rotate keys quarterly')
      expect(output).toContain('%% Skipped connection "see": it connects to a text note')
      expect(output).toContain('%% Skipped connection: it connects to a group with no services')
      expect(output).toContain('%% Skipped connection: it connects a group to its own contents')
      await expect(parseArchitecture(output), output).resolves.toBeTruthy()
    }
  })

  it('handles an empty diagram', async () => {
    const output = exportMermaid(emptyInput)
    expect(output).toContain('%% The diagram is empty')
    await expect(parseArchitecture(output)).resolves.toBeTruthy()
  })
})
