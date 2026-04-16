import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { MonitorController } from '../src/monitor/controllers'
import { MonitorService } from '../src/monitor/services'
import { SourceMapService } from '../src/monitor/services/sourcemap.service'

describe('Monitor API (e2e)', () => {
  let app: INestApplication | undefined
  const monitorService = {
    queryTracking: jest.fn(),
    queryReplay: jest.fn(),
    getStatsOverview: jest.fn(),
    createBatch: jest.fn(),
  }
  const sourceMapService = {
    saveSourceMap: jest.fn(),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MonitorController],
      providers: [
        {
          provide: MonitorService,
          useValue: monitorService,
        },
        {
          provide: SourceMapService,
          useValue: sourceMapService,
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

  it('accepts /batch and returns write summary', async () => {
    monitorService.createBatch.mockResolvedValue({
      tracking: [{ id: 'tracking-1' }],
      performance: [{ id: 'performance-1' }],
      error: [{ id: 'error-1' }],
      replay: [{ id: 'replay-1' }],
      summary: {
        tracking: 1,
        performance: 1,
        error: 1,
        replay: 1,
        total: 4,
      },
    })

    const response = await request(app!.getHttpServer())
      .post('/api/monitor/batch')
      .send({
        items: [
          { type: 'tracking', appId: 'e2e-app', timestamp: Date.now(), eventName: 'page_view' },
          { type: 'performance', appId: 'e2e-app', timestamp: Date.now(), metricType: 'performance_ttfb', value: 120 },
          { type: 'error', appId: 'e2e-app', timestamp: Date.now(), message: 'boom' },
          {
            type: 'replay',
            appId: 'e2e-app',
            timestamp: Date.now(),
            segmentId: 'segment-1',
            startedAt: Date.now() - 1000,
            endedAt: Date.now(),
            eventCount: 1,
          },
        ],
      })
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.summary).toMatchObject({
      tracking: 1,
      performance: 1,
      error: 1,
      replay: 1,
      total: 4,
    })
  })

  it('returns /stats/overview payload', async () => {
    monitorService.getStatsOverview.mockResolvedValue({
      tracking: 10,
      performance: 5,
      error: 2,
      replay: 1,
      total: 18,
    })

    const response = await request(app!.getHttpServer())
      .get('/api/monitor/stats/overview?appId=e2e-app')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      tracking: 10,
      performance: 5,
      error: 2,
      replay: 1,
      total: 18,
    })
  })

  it('supports /replay query with segmentId filter', async () => {
    monitorService.queryReplay.mockResolvedValue({
      items: [
        {
          appId: 'e2e-app',
          segmentId: 'segment-1',
          eventCount: 2,
          route: '/checkout',
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    })

    const response = await request(app!.getHttpServer())
      .get('/api/monitor/replay?appId=e2e-app&segmentId=segment-1&page=1&pageSize=10&sortBy=timestamp&sortOrder=desc')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0]).toMatchObject({
      appId: 'e2e-app',
      segmentId: 'segment-1',
      route: '/checkout',
      eventCount: 2,
    })
  })
})
