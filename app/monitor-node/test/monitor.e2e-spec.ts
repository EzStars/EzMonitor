import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { MonitorController } from '../src/monitor/controllers'
import { MonitorService } from '../src/monitor/services'

describe('MonitorController (e2e)', () => {
  let app: INestApplication | undefined
  const monitorService = {
    queryTracking: jest.fn(),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MonitorController],
      providers: [
        {
          provide: MonitorService,
          useValue: monitorService,
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

  it('GET /api/monitor/tracking', () => {
    monitorService.queryTracking.mockResolvedValue({
      items: [{ appId: 'app-1', eventName: 'page_view' }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })

    return request(app!.getHttpServer())
      .get('/api/monitor/tracking?appId=app-1&page=1&pageSize=20&sortBy=timestamp&sortOrder=desc')
      .expect(200)
      .expect({
        success: true,
        data: {
          items: [{ appId: 'app-1', eventName: 'page_view' }],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
  })
})
