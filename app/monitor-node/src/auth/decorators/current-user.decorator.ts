import type { ExecutionContext } from '@nestjs/common'
import type { AuthenticatedRequest, AuthTokenPayload } from '../types'
import { createParamDecorator, UnauthorizedException } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthTokenPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!request.authUser) {
      throw new UnauthorizedException('Authentication required')
    }

    return request.authUser
  },
)
