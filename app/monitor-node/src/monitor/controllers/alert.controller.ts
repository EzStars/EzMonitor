import type { AuthTokenPayload } from '../../auth'
import type { AlertEventStatus } from '../dto/alert.dto'
import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common'
import { AuthRequired, AuthService, CurrentUser } from '../../auth'
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
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Post('rules')
  @AuthRequired()
  async createRule(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateCreateAlertRuleDto, body, 'Invalid alert rule payload')
    const scope = await this.authService.resolveProjectScope(user.sub, dto.appId)
    const data = await this.alertRuleService.createRule({
      ...dto,
      appId: scope.selectedAppId,
    })
    return { success: true, data }
  }

  @Get('rules')
  @AuthRequired()
  async listRules(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertRuleQueryDto, query, 'Invalid alert rule query')
    const allowedAppIds = await this.authService.getReadableAppIds(user.sub, dto.appId)
    const data = await this.alertRuleService.listRulesForAppIds(allowedAppIds, dto)
    return { success: true, data }
  }

  @Patch('rules/:id')
  @AuthRequired()
  async updateRule(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateUpdateAlertRuleDto, body, 'Invalid alert rule update payload')
    const allowedAppIds = await this.authService.getReadableAppIds(user.sub)
    await this.assertRuleAccessible(id, allowedAppIds)
    const data = await this.alertRuleService.updateRule(id, dto)
    return { success: true, data }
  }

  @Delete('rules/:id')
  @AuthRequired()
  async deleteRule(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
  ): Promise<{ success: true, data: unknown }> {
    const allowedAppIds = await this.authService.getReadableAppIds(user.sub)
    await this.assertRuleAccessible(id, allowedAppIds)
    const data = await this.alertRuleService.deleteRule(id)
    return { success: true, data }
  }

  @Get('events')
  @AuthRequired()
  async listEvents(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertEventQueryDto, query, 'Invalid alert event query')
    const allowedAppIds = await this.authService.getReadableAppIds(user.sub, dto.appId)
    const data = await this.alertEventService.listEventsForAppIds(allowedAppIds, dto)
    return { success: true, data }
  }

  @Patch('events/:id/status')
  @AuthRequired()
  async updateEventStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ success: true, data: unknown }> {
    const dto = this.parseDto(validateAlertEventStatusDto, body, 'Invalid alert event status payload')
    const allowedAppIds = await this.authService.getReadableAppIds(user.sub)
    await this.assertAlertEventAccessible(id, allowedAppIds)
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

  private async assertRuleAccessible(ruleId: string, allowedAppIds: string[]): Promise<void> {
    const rule = await this.alertRuleService.getRuleById(ruleId)
    if (!rule?.appId) {
      return
    }

    if (!allowedAppIds.includes(rule.appId)) {
      throw new UnauthorizedException('Requested rule is not accessible')
    }
  }

  private async assertAlertEventAccessible(eventId: string, allowedAppIds: string[]): Promise<void> {
    const event = await this.alertEventService.getEventById(eventId)
    if (!event?.appId) {
      return
    }

    if (!allowedAppIds.includes(event.appId)) {
      throw new UnauthorizedException('Requested event is not accessible')
    }
  }
}
