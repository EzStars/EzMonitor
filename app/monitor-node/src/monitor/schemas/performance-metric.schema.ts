import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Schema as MongooseSchema } from 'mongoose'

export type PerformanceMetricDocument = HydratedDocument<PerformanceMetric>

@Schema({
  timestamps: true,
  collection: 'performance_metrics',
})
export class PerformanceMetric {
  @Prop({ required: true, index: true })
  appId: string

  @Prop({ required: true, index: true })
  timestamp: Date

  @Prop({ required: true, trim: true, index: true })
  metricType: string

  @Prop({ required: true })
  value: number

  @Prop({ trim: true })
  url?: string

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  extra: Record<string, unknown>

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  context: Record<string, unknown>
}

export const PerformanceMetricSchema = SchemaFactory.createForClass(
  PerformanceMetric,
)
PerformanceMetricSchema.index({ appId: 1, timestamp: -1 })
PerformanceMetricSchema.index({ appId: 1, metricType: 1, timestamp: -1 })
