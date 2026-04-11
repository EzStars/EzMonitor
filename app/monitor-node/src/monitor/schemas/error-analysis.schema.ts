import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Schema as MongooseSchema } from 'mongoose'
import { ALERT_SEVERITIES } from '../dto/alert.dto'

export type ErrorAnalysisDocument = HydratedDocument<ErrorAnalysis>

@Schema({
  timestamps: true,
  collection: 'error_analyses',
})
export class ErrorAnalysis {
  @Prop({ required: true, trim: true, index: true })
  appId: string

  @Prop({ trim: true, index: true })
  sourceErrorId?: string

  @Prop({ trim: true, index: true })
  errorType?: string

  @Prop({ trim: true, index: true })
  fingerprint?: string

  @Prop({ required: true, min: 0, max: 100 })
  score: number

  @Prop({ type: String, required: true, enum: ALERT_SEVERITIES, default: 'low', index: true })
  severity: (typeof ALERT_SEVERITIES)[number]

  @Prop({ type: [String], default: [] })
  findings: string[]

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  context?: Record<string, unknown>

  @Prop({ required: true, index: true, default: () => new Date() })
  analyzedAt: Date
}

export const ErrorAnalysisSchema = SchemaFactory.createForClass(ErrorAnalysis)
ErrorAnalysisSchema.index({ appId: 1, analyzedAt: -1 })
