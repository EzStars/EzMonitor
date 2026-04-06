import type { NextFunction, Request, Response } from 'express'
import * as process from 'node:process'
import { NestFactory } from '@nestjs/core'
import { json } from 'express'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

interface RateLimitBucket {
  count: number
  resetAt: number
}

const RATE_LIMIT_MAP = new Map<string, RateLimitBucket>()

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function isAllowedLocalhostOrigin(origin: string): boolean {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
}

function applyRateLimit(req: Request, res: Response, next: NextFunction): void {
  const path = req.path || ''
  if (!path.startsWith('/api/monitor')) {
    next()
    return
  }

  const now = Date.now()
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const windowMs = Number(process.env.MONITOR_RATE_LIMIT_WINDOW_MS || 60000)
  const maxRequests = Number(process.env.MONITOR_RATE_LIMIT_MAX || 240)
  const bucketKey = `${ip}:${path}`
  const current = RATE_LIMIT_MAP.get(bucketKey)

  if (!current || now >= current.resetAt) {
    RATE_LIMIT_MAP.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    })
    next()
    return
  }

  if (current.count >= maxRequests) {
    res.status(429).json({
      success: false,
      message: 'Too many requests',
    })
    return
  }

  current.count += 1
  RATE_LIMIT_MAP.set(bucketKey, current)
  next()
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  })

  app.use(json({ limit: process.env.MONITOR_MAX_BODY_SIZE || '8mb' }))
  app.use(applyRateLimit)
  app.useGlobalFilters(new AllExceptionsFilter())

  const corsOriginAllowList = parseCorsOrigins()
  const allowLocalhostByDefault = process.env.CORS_ALLOW_LOCALHOST !== 'false'

  // CORS: 支持环境变量白名单，同时默认允许本地 localhost/127.0.0.1 任意端口。
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }

      if (corsOriginAllowList.includes(origin)) {
        callback(null, true)
        return
      }

      if (allowLocalhostByDefault && isAllowedLocalhostOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`Application is running on: http://localhost:${port}`)
}
bootstrap()
