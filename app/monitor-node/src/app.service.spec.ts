import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { AppService } from './app.service'

describe('appService', () => {
  let appService: AppService

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile()

    appService = app.get<AppService>(AppService)
  })

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appService.getHello()).toBe('Hello World!')
    })
  })
})
