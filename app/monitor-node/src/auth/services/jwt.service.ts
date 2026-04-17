import type { AuthTokenPayload } from '../types'
import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import * as process from 'node:process'
import { Injectable, UnauthorizedException } from '@nestjs/common'

interface JwtHeader {
  alg: 'HS256'
  typ: 'JWT'
}

interface JwtBody {
  sub: string
  email: string
  iat: number
  exp: number
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function encodeObject(payload: object): string {
  return toBase64Url(JSON.stringify(payload))
}

function decodeObject<T>(payload: string): T {
  const raw = Buffer.from(payload, 'base64url').toString('utf8')
  return JSON.parse(raw) as T
}

@Injectable()
export class JwtService {
  private readonly secret = process.env.AUTH_JWT_SECRET?.trim() || 'dev-change-me-auth-jwt-secret'
  private readonly expiresInSeconds = this.parseExpiresIn(process.env.AUTH_ACCESS_TOKEN_TTL_SEC)

  getExpiresInSeconds(): number {
    return this.expiresInSeconds
  }

  sign(payload: Pick<AuthTokenPayload, 'sub' | 'email'>): string {
    const now = Math.floor(Date.now() / 1000)
    const body: JwtBody = {
      sub: payload.sub,
      email: payload.email,
      iat: now,
      exp: now + this.expiresInSeconds,
    }

    const header: JwtHeader = {
      alg: 'HS256',
      typ: 'JWT',
    }

    const encodedHeader = encodeObject(header)
    const encodedBody = encodeObject(body)
    const signature = this.signRaw(`${encodedHeader}.${encodedBody}`)
    return `${encodedHeader}.${encodedBody}.${signature}`
  }

  verify(token: string): AuthTokenPayload {
    const trimmed = token.trim()
    if (!trimmed) {
      throw new UnauthorizedException('Token is missing')
    }

    const parts = trimmed.split('.')
    if (parts.length !== 3) {
      throw new UnauthorizedException('Token is invalid')
    }

    const [encodedHeader, encodedBody, encodedSignature] = parts
    const expectedSignature = this.signRaw(`${encodedHeader}.${encodedBody}`)
    if (!this.isValidSignature(encodedSignature, expectedSignature)) {
      throw new UnauthorizedException('Token signature is invalid')
    }

    const header = decodeObject<JwtHeader>(encodedHeader)
    if (header.alg !== 'HS256') {
      throw new UnauthorizedException('Token algorithm is not supported')
    }

    const body = decodeObject<JwtBody>(encodedBody)
    if (!body.sub || !body.email || !body.exp || !body.iat) {
      throw new UnauthorizedException('Token payload is invalid')
    }

    const now = Math.floor(Date.now() / 1000)
    if (body.exp <= now) {
      throw new UnauthorizedException('Token has expired')
    }

    return {
      sub: body.sub,
      email: body.email,
      iat: body.iat,
      exp: body.exp,
    }
  }

  private signRaw(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url')
  }

  private isValidSignature(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual)
    const expectedBuffer = Buffer.from(expected)
    if (actualBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(actualBuffer, expectedBuffer)
  }

  private parseExpiresIn(value: string | undefined): number {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed >= 300 && parsed <= 60 * 60 * 24 * 7) {
      return parsed
    }

    return 60 * 15
  }
}
