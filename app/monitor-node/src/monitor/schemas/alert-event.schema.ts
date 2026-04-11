import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Schema as MongooseSchema } from 'mongoose'
import { ALERT_EVENT_STATUSES, ALERT_METRICS, ALERT_SEVERITIES } from '../dto/alert.dto'

export type AlertEventDocument = HydratedDocument<AlertEvent>

@Schema({
  timestamps: true,
  collection: 'alert_events',
})
export class AlertEvent {
  @Prop({ trim: true })
  ruleId?: string

  @Prop({ required: true, trim: true })
  ruleName: string

  @Prop({ trim: true, index: true })
  appId?: string

  @Prop({ type: String, required: true, enum: ALERT_METRICS, default: 'error_frequency', index: true })
  metric: (typeof ALERT_METRICS)[number]

  @Prop({ type: String, required: true, enum: ALERT_SEVERITIES, default: 'medium', index: true })
  severity: (typeof ALERT_SEVERITIES)[number]

  @Prop({ required: true, min: 0, max: 100 })
  score: number

  @Prop({ required: true, trim: true })
  summary: string

  @Prop({ type: [String], default: [] })
  findings: string[]

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  context?: Record<string, unknown>

  @Prop({ trim: true, index: true })
  sourceErrorId?: string

  @Prop({ trim: true, index: true })
  dedupeKey?: string

  @Prop({ min: 0, default: 0 })
  suppressionHits: number

  @Prop({ required: true, index: true, default: () => new Date() })
  triggeredAt: Date

  @Prop({ type: String, required: true, enum: ALERT_EVENT_STATUSES, default: 'open', index: true })
  status: (typeof ALERT_EVENT_STATUSES)[number]
}

export const AlertEventSchema = SchemaFactory.createForClass(AlertEvent)
AlertEventSchema.index({ appId: 1, triggeredAt: -1 })
AlertEventSchema.index({ dedupeKey: 1, triggeredAt: -1 })
