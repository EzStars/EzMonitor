import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

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
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog)
ErrorLogSchema.index({ appId: 1, timestamp: -1 })
ErrorLogSchema.index({ appId: 1, errorType: 1, timestamp: -1 })
