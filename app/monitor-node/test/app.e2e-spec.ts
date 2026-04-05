import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AppController } from './../src/app.controller'
import { AppService } from './../src/app.service'

describe('AppController (e2e)', () => {
  let app: INestApplication | undefined

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it('/ (GET)', () => {
    return request(app!.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!')
  })
})
