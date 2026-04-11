import { BadRequestException } from '@nestjs/common'
import { AllExceptionsFilter } from './all-exceptions.filter'

describe('allExceptionsFilter', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
  const request = { url: '/api/monitor/tracking' }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should format http exceptions consistently', () => {
    new AllExceptionsFilter().catch(new BadRequestException('Invalid tracking query'), host as never)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Invalid tracking query',
        path: '/api/monitor/tracking',
        data: null,
      }),
    )
  })

  it('should format unexpected errors consistently', () => {
    new AllExceptionsFilter().catch(new Error('boom'), host as never)

    expect(response.status).toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'boom',
        path: '/api/monitor/tracking',
        data: null,
      }),
    )
  })
})
