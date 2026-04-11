import type { AlertEventRecord } from '../services/monitor'
import { describe, expect, it } from 'vitest'
import { mergeAlerts } from './useAlertStream'

describe('mergeAlerts', () => {
  it('deduplicates by id and keeps latest first', () => {
    const current: AlertEventRecord[] = [
      {
        _id: 'a-1',
        ruleName: 'rule-a',
        metric: 'error_frequency',
        severity: 'high',
        score: 80,
        summary: 'old alert',
        findings: [],
        status: 'open',
        triggeredAt: '2026-04-11T00:00:00.000Z',
      },
    ]

    const incoming: AlertEventRecord[] = [
      {
        _id: 'a-1',
        ruleName: 'rule-a',
        metric: 'error_frequency',
        severity: 'high',
        score: 85,
        summary: 'new alert',
        findings: [],
        status: 'open',
        triggeredAt: '2026-04-11T01:00:00.000Z',
      },
      {
        _id: 'a-2',
        ruleName: 'rule-b',
        metric: 'error_spread',
        severity: 'critical',
        score: 95,
        summary: 'critical alert',
        findings: [],
        status: 'open',
        triggeredAt: '2026-04-11T02:00:00.000Z',
      },
    ]

    const merged = mergeAlerts(current, incoming, 20)

    expect(merged).toHaveLength(2)
    expect(merged[0]._id).toBe('a-2')
    expect(merged[1].summary).toBe('new alert')
  })

  it('respects list size limit', () => {
    const build = (index: number): AlertEventRecord => ({
      _id: `id-${index}`,
      ruleName: 'rule',
      metric: 'error_frequency',
      severity: 'medium',
      score: 70,
      summary: `alert-${index}`,
      findings: [],
      status: 'open',
      triggeredAt: new Date(2026, 3, 11, 0, index).toISOString(),
    })

    const merged = mergeAlerts([], [build(1), build(2), build(3)], 2)
    expect(merged).toHaveLength(2)
    expect(merged[0]._id).toBe('id-3')
  })
})
