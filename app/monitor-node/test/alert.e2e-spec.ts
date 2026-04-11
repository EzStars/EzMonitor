import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AlertController, SseEventsController } from '../src/monitor/controllers'
import { AlertEventService } from '../src/monitor/services/alert-event.service'
import { AlertRuleService } from '../src/monitor/services/alert-rule.service'
import { SseBroadcastService } from '../src/monitor/services/sse-broadcast.service'

describe('Alert API (e2e)', () => {
  let app: INestApplication | undefined

  const alertRuleService = {
    createRule: jest.fn(),
    listRules: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
  }

  const alertEventService = {
    listEvents: jest.fn(),
    updateStatus: jest.fn(),
    getLatestAlerts: jest.fn(),
  }

  const sseBroadcastService = {
    stream: jest.fn(),
    emitAlert: jest.fn(),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AlertController, SseEventsController],
      providers: [
        {
          provide: AlertRuleService,
          useValue: alertRuleService,
        },
        {
          provide: AlertEventService,
          useValue: alertEventService,
        },
        {
          provide: SseBroadcastService,
          useValue: sseBroadcastService,
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates alert rule via /api/monitor/alerts/rules', async () => {
    alertRuleService.createRule.mockResolvedValue({
      _id: 'rule-1',
      name: 'High error frequency',
      metric: 'error_frequency',
      threshold: 3,
      windowSec: 300,
      suppressSec: 300,
      dedupeStrategy: 'by_rule',
      severity: 'high',
      enabled: true,
    })

    const response = await request(app!.getHttpServer())
      .post('/api/monitor/alerts/rules')
      .send({
        name: 'High error frequency',
        metric: 'error_frequency',
        threshold: 3,
        windowSec: 300,
        suppressSec: 300,
        dedupeStrategy: 'by_rule',
        severity: 'high',
      })
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      name: 'High error frequency',
      metric: 'error_frequency',
      suppressSec: 300,
      dedupeStrategy: 'by_rule',
    })
  })

  it('updates alert rule suppress and dedupe strategy', async () => {
    alertRuleService.updateRule.mockResolvedValue({
      _id: 'rule-1',
      name: 'High error frequency',
      metric: 'error_frequency',
      threshold: 3,
      windowSec: 300,
      suppressSec: 600,
      dedupeStrategy: 'by_fingerprint',
      severity: 'high',
      enabled: true,
    })

    const response = await request(app!.getHttpServer())
      .patch('/api/monitor/alerts/rules/rule-1')
      .send({
        suppressSec: 600,
        dedupeStrategy: 'by_fingerprint',
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      suppressSec: 600,
      dedupeStrategy: 'by_fingerprint',
    })
  })

  it('queries alert events via /api/monitor/alerts/events', async () => {
    alertEventService.listEvents.mockResolvedValue({
      items: [
        {
          _id: 'event-1',
          ruleName: 'builtin_error_frequency',
          suppressionHits: 4,
          status: 'open',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })

    const response = await request(app!.getHttpServer())
      .get('/api/monitor/alerts/events?appId=e2e-app&page=1&pageSize=20')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0]).toMatchObject({
      ruleName: 'builtin_error_frequency',
      suppressionHits: 4,
      status: 'open',
    })
  })

  it('updates alert event status', async () => {
    alertEventService.updateStatus.mockResolvedValue({
      _id: 'event-1',
      status: 'acknowledged',
    })

    const response = await request(app!.getHttpServer())
      .patch('/api/monitor/alerts/events/event-1/status')
      .send({ status: 'acknowledged' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      status: 'acknowledged',
    })
  })

  it('returns latest alerts for SSE fallback polling', async () => {
    alertEventService.getLatestAlerts.mockResolvedValue([
      {
        _id: 'event-1',
        summary: 'recent alert',
      },
    ])

    const response = await request(app!.getHttpServer())
      .get('/api/monitor/events/latest-alerts?appId=e2e-app&limit=10')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0]).toMatchObject({ summary: 'recent alert' })
  })
})
