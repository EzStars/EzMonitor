import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

export type ErrorLogDocument = HydratedDocument<ErrorLog>

@Schema({
  timestamps: true,
  collection: 'error_logs',
})
export class ErrorLog {
  @Prop({ required: true, index: true })
  appId: string

  @Prop({ required: true, index: true })
  timestamp: Date

  @Prop({ trim: true, index: true })
  errorType?: string

  @Prop({ required: true })
  message: string

  @Prop()
  stack?: string

  @Prop({ trim: true })
  url?: string

  @Prop({ trim: true })
  userAgent?: string

  @Prop({ trim: true })
  sessionId?: string

  @Prop({ trim: true })
  userId?: string

  @Prop({ trim: true })
  appVersion?: string

  @Prop({ trim: true, index: true })
  release?: string

  @Prop({ trim: true })
  environment?: string

  @Prop({ trim: true, index: true })
  fingerprint?: string

  @Prop({ trim: true })
  traceId?: string

  @Prop({ type: Array, default: [] })
  frames?: Array<{
    file?: string
    line?: number
    column?: number
    functionName?: string
    raw?: string
    originalFile?: string
    originalLine?: number
    originalColumn?: number
    originalFunctionName?: string
  }>

  @Prop({ type: Object })
  detail?: Record<string, unknown>

  @Prop({ trim: true, default: 'skipped' })
  symbolicationStatus?: 'symbolicated' | 'partial' | 'failed' | 'skipped'

  @Prop({ trim: true })
  symbolicationReason?: string
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog)
ErrorLogSchema.index({ appId: 1, timestamp: -1 })
ErrorLogSchema.index({ appId: 1, errorType: 1, timestamp: -1 })
