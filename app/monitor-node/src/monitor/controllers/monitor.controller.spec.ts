/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { MonitorService } from '../services/monitor.service'
import { SourceMapService } from '../services/sourcemap.service'
import { MonitorController } from './monitor.controller'

describe('monitorController', () => {
  let controller: MonitorController
  const monitorService = {
    queryTracking: jest.fn(),
    queryReplay: jest.fn(),
    createTracking: jest.fn(),
    createReplay: jest.fn(),
    createBatch: jest.fn(),
    getErrorRootCause: jest.fn(),
    getRootCauseSummary: jest.fn(),
  }
  const sourceMapService = {
    saveSourceMap: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
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

    controller = moduleRef.get(MonitorController)
  })

  it('should return tracking query data', async () => {
    monitorService.queryTracking.mockResolvedValue({ items: [], page: 1 })

    await expect(
      controller.queryTracking({
        appId: 'app-1',
        page: '2',
        pageSize: '10',
        sortBy: 'timestamp',
        sortOrder: 'asc',
      }),
    ).resolves.toEqual({
      success: true,
      data: { items: [], page: 1 },
    })
    expect(monitorService.queryTracking).toHaveBeenCalledWith({
      appId: 'app-1',
      page: 2,
      pageSize: 10,
      sortBy: 'timestamp',
      sortOrder: 'asc',
    })
  })

  it('should return tracking write response', async () => {
    const timestamp = new Date('2024-01-01T00:00:00.000Z')
    monitorService.createTracking.mockResolvedValue({ id: 'tracking-1' })

    await expect(
      controller.createTracking({
        appId: 'app-1',
        eventName: 'page_view',
        timestamp,
      }),
    ).resolves.toEqual({
      success: true,
      writtenCount: 1,
      summary: {
        tracking: 1,
        performance: 0,
        error: 0,
        total: 1,
      },
      data: { id: 'tracking-1' },
    })
  })

  it('should return batch write response', async () => {
    monitorService.createBatch.mockResolvedValue({
      tracking: [{ id: 'tracking-1' }],
      performance: [{ id: 'performance-1' }],
      error: [],
      replay: [],
      summary: {
        tracking: 1,
        performance: 1,
        error: 0,
        replay: 0,
        total: 2,
      },
    })

    await expect(
      controller.createBatch([
        { type: 'tracking', appId: 'app-1', timestamp: new Date(), eventName: 'page_view' },
        { type: 'performance', appId: 'app-1', timestamp: new Date(), metricType: 'ttfb', value: 120 },
      ]),
    ).resolves.toEqual({
      success: true,
      writtenCount: 2,
      summary: {
        tracking: 1,
        performance: 1,
        error: 0,
        replay: 0,
        total: 2,
      },
      data: {
        tracking: 1,
        performance: 1,
        error: 0,
        replay: 0,
      },
    })
  })

  it('should return replay query data', async () => {
    monitorService.queryReplay.mockResolvedValue({ items: [], page: 1 })

    await expect(
      controller.queryReplay({
        appId: 'app-1',
        page: '1',
        pageSize: '10',
        sortBy: 'timestamp',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual({
      success: true,
      data: { items: [], page: 1 },
    })
  })

  it('should return root cause summary data', async () => {
    monitorService.getRootCauseSummary.mockResolvedValue([
      {
        category: 'error_frequency',
        title: '高频错误',
        count: 2,
      },
    ])

    await expect(
      controller.getRootCauseSummary({
        appId: 'app-1',
        startTime: '1712700000000',
        endTime: '1712786400000',
        limit: '5',
      }),
    ).resolves.toEqual({
      success: true,
      data: [
        {
          category: 'error_frequency',
          title: '高频错误',
          count: 2,
        },
      ],
    })
    expect(monitorService.getRootCauseSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'app-1',
        limit: 5,
      }),
    )
  })

  it('should return root cause detail by error id', async () => {
    monitorService.getErrorRootCause.mockResolvedValue({
      rootCause: {
        category: 'performance_regression',
        title: '性能回归触发异常',
      },
      confidence: 86,
    })

    await expect(controller.getErrorRootCause('error-1')).resolves.toEqual({
      success: true,
      data: {
        rootCause: {
          category: 'performance_regression',
          title: '性能回归触发异常',
        },
        confidence: 86,
      },
    })
    expect(monitorService.getErrorRootCause).toHaveBeenCalledWith('error-1')
  })

  it('should reject invalid root cause summary limit', async () => {
    await expect(controller.getRootCauseSummary({ limit: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('should reject invalid query payloads', async () => {
    await expect(controller.queryTracking({ page: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('should bubble service errors for consistent global handling', async () => {
    monitorService.queryTracking.mockRejectedValue(new Error('db down'))

    await expect(
      controller.queryTracking({
        appId: 'app-1',
        page: '1',
        pageSize: '10',
      }),
    ).rejects.toThrow('db down')
  })
})
