import type { MessageEvent } from '@nestjs/common'
import type { Observable } from 'rxjs'
import type { AuthTokenPayload } from '../../auth'
import { BadRequestException, Controller, Get, Inject, Query, Sse } from '@nestjs/common'
import { AuthRequired, AuthService, CurrentUser } from '../../auth'
import { validateAlertStreamQueryDto } from '../dto/validation'
import { AlertEventService } from '../services/alert-event.service'
import { SseBroadcastService } from '../services/sse-broadcast.service'

@Controller('api/monitor/events')
export class SseEventsController {
  constructor(
    @Inject(SseBroadcastService)
    private readonly sseBroadcastService: SseBroadcastService,
    @Inject(AlertEventService)
    private readonly alertEventService: AlertEventService,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Sse('stream')
  @AuthRequired()
  async stream(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<Observable<MessageEvent>> {
    const dto = this.parseDto(validateAlertStreamQueryDto, query, 'Invalid stream query')
    const scope = await this.authService.resolveProjectScope(user.sub, dto.appId)
    return this.sseBroadcastService.stream(scope.selectedAppId)
  }

  @Get('latest-alerts')
  @AuthRequired()
  async latest(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertStreamQueryDto, query, 'Invalid latest alerts query')
    const allowedAppIds = await this.authService.getReadableAppIds(user.sub, dto.appId)
    const data = await this.alertEventService.getLatestAlertsForAppIds(allowedAppIds, dto.appId, dto.limit)
    return { success: true, data }
  }

  private parseDto<T>(parser: (value: unknown) => T, value: unknown, message: string): T {
    try {
      return parser(value)
    }
    catch {
      throw new BadRequestException(message)
    }
  }
}
