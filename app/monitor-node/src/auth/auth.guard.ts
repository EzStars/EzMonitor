import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { AuthenticatedRequest } from './types'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AUTH_REQUIRED, PROJECT_API_KEY_OPTIONAL } from './constants'
import { AuthService } from './services'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authRequired = this.reflector.getAllAndOverride<boolean>(AUTH_REQUIRED, [
      context.getHandler(),
      context.getClass(),
    ]) ?? false
    const apiKeyOptional = this.reflector.getAllAndOverride<boolean>(PROJECT_API_KEY_OPTIONAL, [
      context.getHandler(),
      context.getClass(),
    ]) ?? false

    if (authRequired) {
      request.authUser = this.parseAuthorization(
        request.headers.authorization,
        request.path,
        this.readAuthTokenFromQuery(request),
      )
    }

    if (!apiKeyOptional && this.isMonitorIngestPath(request.path, request.method)) {
      const appIds = this.readAppIdsFromRequest(request)
      const apiKey = this.readProjectApiKey(request)
      if (!appIds.length) {
        throw new UnauthorizedException('appId is required for monitor write')
      }

      for (const appId of appIds) {
        await this.authService.assertProjectWriteAccess(appId, apiKey)
      }
    }

    return true
  }

  private parseAuthorization(
    rawHeader: string | string[] | undefined,
    path: string,
    queryToken?: string,
  ) {
    const normalizedHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
    const header = normalizedHeader?.trim()
    if (!header) {
      if (path === '/api/monitor/events/stream' && queryToken) {
        return this.authService.verifyAccessToken(queryToken)
      }
      throw new UnauthorizedException('Authorization header is required')
    }

    const [scheme, token] = header.split(' ')
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Authorization must use Bearer token')
    }

    return this.authService.verifyAccessToken(token)
  }

  private readProjectApiKey(request: AuthenticatedRequest): string {
    const headerValue = request.headers['x-monitor-api-key']
    if (Array.isArray(headerValue)) {
      return headerValue[0] || ''
    }
    if (typeof headerValue === 'string') {
      return headerValue
    }
    return ''
  }

  private readAuthTokenFromQuery(request: AuthenticatedRequest): string | undefined {
    const record = this.isRecord(request.query) ? request.query : {}
    const rawToken = record.authToken
    if (typeof rawToken === 'string' && rawToken.trim()) {
      return rawToken.trim()
    }

    if (Array.isArray(rawToken)) {
      const first = rawToken[0]
      if (typeof first === 'string' && first.trim()) {
        return first.trim()
      }
    }

    return undefined
  }

  private readAppIdsFromRequest(request: AuthenticatedRequest): string[] {
    const appIds = new Set<string>()
    const body = request.body

    if (this.isRecord(body) && typeof body.appId === 'string' && body.appId.trim()) {
      appIds.add(body.appId.trim())
    }

    if (this.isRecord(body) && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (this.isRecord(item) && typeof item.appId === 'string' && item.appId.trim()) {
          appIds.add(item.appId.trim())
        }
      }
    }

    if (Array.isArray(body)) {
      for (const item of body) {
        if (this.isRecord(item) && typeof item.appId === 'string' && item.appId.trim()) {
          appIds.add(item.appId.trim())
        }
      }
    }

    return [...appIds]
  }

  private isMonitorIngestPath(path: string, method: string): boolean {
    if (method.toUpperCase() !== 'POST') {
      return false
    }

    return path === '/api/monitor/tracking'
      || path === '/api/monitor/performance'
      || path === '/api/monitor/error'
      || path === '/api/monitor/replay'
      || path === '/api/monitor/batch'
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
