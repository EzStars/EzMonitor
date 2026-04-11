import type { MessageEvent } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { BadRequestException, Controller, Get, Inject, Query, Sse } from '@nestjs/common'
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
  ) {}

  @Sse('stream')
  stream(@Query() query: unknown): Observable<MessageEvent> {
    const dto = this.parseDto(validateAlertStreamQueryDto, query, 'Invalid stream query')
    return this.sseBroadcastService.stream(dto.appId)
  }

  @Get('latest-alerts')
  async latest(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertStreamQueryDto, query, 'Invalid latest alerts query')
    const data = await this.alertEventService.getLatestAlerts(dto.appId, dto.limit)
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
