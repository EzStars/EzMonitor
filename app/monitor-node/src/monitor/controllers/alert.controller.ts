import type { AlertEventStatus } from '../dto/alert.dto'
import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import {
  validateAlertEventQueryDto,
  validateAlertEventStatusDto,
  validateAlertRuleQueryDto,
  validateCreateAlertRuleDto,
  validateUpdateAlertRuleDto,
} from '../dto/validation'
import { AlertEventService } from '../services/alert-event.service'
import { AlertRuleService } from '../services/alert-rule.service'

@Controller('api/monitor/alerts')
export class AlertController {
  constructor(
    @Inject(AlertRuleService)
    private readonly alertRuleService: AlertRuleService,
    @Inject(AlertEventService)
    private readonly alertEventService: AlertEventService,
  ) {}

  @Post('rules')
  async createRule(@Body() body: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateCreateAlertRuleDto, body, 'Invalid alert rule payload')
    const data = await this.alertRuleService.createRule(dto)
    return { success: true, data }
  }

  @Get('rules')
  async listRules(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertRuleQueryDto, query, 'Invalid alert rule query')
    const data = await this.alertRuleService.listRules(dto)
    return { success: true, data }
  }

  @Patch('rules/:id')
  async updateRule(@Param('id') id: string, @Body() body: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateUpdateAlertRuleDto, body, 'Invalid alert rule update payload')
    const data = await this.alertRuleService.updateRule(id, dto)
    return { success: true, data }
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string): Promise<{ success: true, data: unknown }> {
    const data = await this.alertRuleService.deleteRule(id)
    return { success: true, data }
  }

  @Get('events')
  async listEvents(@Query() query: unknown): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertEventQueryDto, query, 'Invalid alert event query')
    const data = await this.alertEventService.listEvents(dto)
    return { success: true, data }
  }

  @Patch('events/:id/status')
  async updateEventStatus(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertEventStatusDto, body, 'Invalid alert event status payload')
    const data = await this.alertEventService.updateStatus(id, dto.status as AlertEventStatus)
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
