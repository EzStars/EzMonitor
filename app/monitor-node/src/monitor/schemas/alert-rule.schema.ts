import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ALERT_METRICS, ALERT_SEVERITIES, DEDUPE_STRATEGIES } from '../dto/alert.dto'

export type AlertRuleDocument = HydratedDocument<AlertRule>

@Schema({
  timestamps: true,
  collection: 'alert_rules',
})
export class AlertRule {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ trim: true, index: true })
  appId?: string

  @Prop({ type: String, required: true, enum: ALERT_METRICS, default: 'error_frequency', index: true })
  metric: (typeof ALERT_METRICS)[number]

  @Prop({ required: true, min: 30, default: 300 })
  windowSec: number

  @Prop({ min: 30, max: 86400, default: 300 })
  suppressSec?: number

  @Prop({ type: String, enum: DEDUPE_STRATEGIES, default: 'by_rule' })
  dedupeStrategy?: (typeof DEDUPE_STRATEGIES)[number]

  @Prop({ required: true, min: 1, default: 5 })
  threshold: number

  @Prop({ type: String, required: true, enum: ALERT_SEVERITIES, default: 'medium', index: true })
  severity: (typeof ALERT_SEVERITIES)[number]

  @Prop({ default: true, index: true })
  enabled: boolean

  @Prop({ trim: true, index: true })
  errorType?: string

  @Prop({ trim: true, index: true })
  fingerprint?: string
}

export const AlertRuleSchema = SchemaFactory.createForClass(AlertRule)
AlertRuleSchema.index({ appId: 1, enabled: 1, metric: 1 })
