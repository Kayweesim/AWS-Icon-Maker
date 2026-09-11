import { describe, expect, it } from 'vitest'
import { QUICK_ADD_LIMIT, quickSearch } from './quickSearch'

const names = (query: string) => quickSearch(query).map((item) => item.name)

describe('quickSearch', () => {
  it('ranks the service itself first', () => {
    expect(names('lambda')[0]).toBe('AWS Lambda')
    expect(names('dynamo')[0]).toBe('Amazon DynamoDB')
    expect(names('ec2')[0]).toBe('Amazon EC2')
    expect(names('cloudwatch')[0]).toBe('Amazon CloudWatch')
  })

  it('understands common abbreviations', () => {
    expect(names('s3')[0]).toBe('Amazon Simple Storage Service')
    expect(names('sqs')[0]).toBe('Amazon Simple Queue Service')
    expect(names('alb')).toContain('Application Load Balancer')
  })

  it('finds groups', () => {
    expect(quickSearch('vpc').slice(0, 3)).toContainEqual(expect.objectContaining({ kind: 'group', name: 'VPC' }))
    expect(quickSearch('public subnet')[0]).toMatchObject({ kind: 'group', groupType: 'public-subnet' })
  })

  it('requires every word to match', () => {
    expect(names('rds proxy')[0]).toContain('RDS Proxy')
    expect(names('load balancer')[0]).toMatch(/Load Balancer/)
    expect(names('zzzz not a service')).toEqual([])
  })

  it('limits results, and suggests four common services before anything is typed', () => {
    expect(quickSearch('amazon')).toHaveLength(QUICK_ADD_LIMIT)
    expect(names('')).toEqual(['Amazon EC2', 'AWS Lambda', 'Amazon Simple Storage Service', 'Amazon RDS'])
  })

  it('lists a service that belongs to two categories once', () => {
    const results = names('compute optimizer')
    expect(new Set(results).size).toBe(results.length)
  })
})
