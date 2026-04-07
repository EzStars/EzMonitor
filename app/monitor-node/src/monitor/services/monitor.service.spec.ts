/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common'
import { MonitorBatchItemType } from '../dto'
import { MonitorService } from './monitor.service'

function createExecQuery<T>(result: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  }
}

describe('monitorService', () => {
  it('should create tracking records with normalized timestamp', async () => {
    const trackingModel = { create: jest.fn().mockResolvedValue({ id: 'tracking-1' }) }
    const service = new MonitorService(trackingModel as never, {} as never, {} as never, {} as never)
    const timestamp = '2024-01-01T00:00:00.000Z'

    await expect(
      service.createTracking({
        appId: 'app-1',
        eventName: 'page_view',
        timestamp: new Date(timestamp),
      }),
    ).resolves.toEqual({ id: 'tracking-1' })

    expect(trackingModel.create).toHaveBeenCalledWith({
      appId: 'app-1',
      eventName: 'page_view',
      timestamp: new Date(timestamp),
    })
  })

  it('should create replay segments with normalized timestamps', async () => {
    const replayModel = { create: jest.fn().mockResolvedValue({ id: 'replay-1' }) }
    const service = new MonitorService({} as never, {} as never, {} as never, replayModel as never)
    const timestamp = '2024-01-01T00:00:00.000Z'

    await expect(
      service.createReplay({
        appId: 'app-1',
        segmentId: 'segment-1',
        timestamp: new Date(timestamp),
        startedAt: new Date(timestamp),
        endedAt: new Date('2024-01-01T00:00:05.000Z'),
        eventCount: 3,
      }),
    ).resolves.toEqual({ id: 'replay-1' })

    expect(replayModel.create).toHaveBeenCalledWith({
      appId: 'app-1',
      mode: 'native',
      segmentId: 'segment-1',
      timestamp: new Date(timestamp),
      startedAt: new Date(timestamp),
      endedAt: new Date('2024-01-01T00:00:05.000Z'),
      eventCount: 3,
    })
  })

  it('should create batches and summarize counts', async () => {
    const trackingModel = { create: jest.fn().mockResolvedValue({ id: 'tracking-1' }) }
    const performanceModel = { create: jest.fn().mockResolvedValue({ id: 'performance-1' }) }
    const errorModel = { create: jest.fn().mockResolvedValue({ id: 'error-1' }) }
    const service = new MonitorService(
      trackingModel as never,
      performanceModel as never,
      errorModel as never,
      {} as never,
    )

    await expect(
      service.createBatch([
        {
          type: MonitorBatchItemType.TRACKING,
          appId: 'app-1',
          timestamp: new Date('2024-01-01T00:00:00.000Z'),
          eventName: 'page_view',
        },
        {
          type: MonitorBatchItemType.PERFORMANCE,
          appId: 'app-1',
          timestamp: new Date('2024-01-01T00:00:01.000Z'),
          metricType: 'ttfb',
          value: 120,
        },
        {
          type: MonitorBatchItemType.ERROR,
          appId: 'app-1',
          timestamp: new Date('2024-01-01T00:00:02.000Z'),
          message: 'boom',
        },
      ]),
    ).resolves.toMatchObject({
      summary: {
        tracking: 1,
        performance: 1,
        error: 1,
        replay: 0,
        total: 3,
      },
    })
  })

  it('should query tracking records with paging and sorting', async () => {
    const items = [{ appId: 'app-1' }]
    const trackingModel = {
      countDocuments: jest.fn().mockReturnValue(createExecQuery(1)),
      find: jest.fn().mockReturnValue(createExecQuery(items)),
    }
    const service = new MonitorService(trackingModel as never, {} as never, {} as never, {} as never)

    await expect(
      service.queryTracking({
        appId: 'app-1',
        page: 1,
        pageSize: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      }),
    ).resolves.toMatchObject({
      items,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
  })

  it('should query replay records with paging and sorting', async () => {
    const items = [{ appId: 'app-1' }]
    const replayModel = {
      countDocuments: jest.fn().mockReturnValue(createExecQuery(1)),
      find: jest.fn().mockReturnValue(createExecQuery(items)),
    }
    const service = new MonitorService({} as never, {} as never, {} as never, replayModel as never)

    await expect(
      service.queryReplay({
        appId: 'app-1',
        page: 1,
        pageSize: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      }),
    ).resolves.toMatchObject({
      items,
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
  })

  it('should calculate overview and grouped stats', async () => {
    const trackingModel = {
      countDocuments: jest.fn().mockResolvedValue(2),
      aggregate: jest.fn().mockResolvedValue([{ _id: 'page_view', count: 2 }]),
    }
    const performanceModel = {
      countDocuments: jest.fn().mockResolvedValue(1),
      aggregate: jest.fn().mockResolvedValue([
        {
          _id: 'ttfb',
          count: 2,
          avgValue: 150,
          minValue: 120,
          maxValue: 180,
          values: [120, 180],
        },
      ]),
    }
    const errorModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([{ _id: 'fatal', count: 1 }]),
    }
    const replayModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([{ _id: '/checkout', count: 1 }]),
    }
    const service = new MonitorService(
      trackingModel as never,
      performanceModel as never,
      errorModel as never,
      replayModel as never,
    )

    await expect(service.getStatsOverview({ appId: 'app-1' })).resolves.toEqual({
      tracking: 2,
      performance: 1,
      error: 0,
      replay: 0,
      total: 3,
    })
    await expect(service.getTrackingStats({ appId: 'app-1' })).resolves.toEqual([
      { eventName: 'page_view', count: 2 },
    ])
    await expect(service.getPerformanceStats({ appId: 'app-1' })).resolves.toEqual([
      {
        metricType: 'ttfb',
        count: 2,
        avgValue: 150,
        minValue: 120,
        maxValue: 180,
        p95Value: 180,
      },
    ])
    await expect(service.getErrorStats({ appId: 'app-1' })).resolves.toEqual([
      { errorType: 'fatal', count: 1 },
    ])
    await expect(service.getReplayStats({ appId: 'app-1' })).resolves.toEqual([
      { route: '/checkout', count: 1 },
    ])
  })

  it('should calculate p95 from sorted samples independent of input order', async () => {
    const trackingModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
    }
    const performanceModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([
        {
          _id: 'lcp',
          count: 20,
          avgValue: 10,
          minValue: 1,
          maxValue: 20,
          values: [8, 1, 20, 3, 17, 5, 2, 19, 4, 16, 6, 15, 7, 14, 9, 13, 10, 12, 11, 18],
        },
      ]),
    }
    const errorModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
    }
    const service = new MonitorService(
      trackingModel as never,
      performanceModel as never,
      errorModel as never,
      {} as never,
    )

    await expect(service.getPerformanceStats({ appId: 'app-1' })).resolves.toEqual([
      {
        metricType: 'lcp',
        count: 20,
        avgValue: 10,
        minValue: 1,
        maxValue: 20,
        p95Value: 19,
      },
    ])
  })

  it('should reject unsupported batch types', async () => {
    const trackingModel = { create: jest.fn() }
    const service = new MonitorService(trackingModel as never, {} as never, {} as never, {} as never)

    await expect(
      service.createBatch([
        {
          type: 'unsupported',
          appId: 'app-1',
          timestamp: new Date(),
        } as never,
      ]),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
