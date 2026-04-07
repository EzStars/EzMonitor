import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Schema as MongooseSchema } from 'mongoose'

export type ReplaySegmentDocument = HydratedDocument<ReplaySegment>

@Schema({
  timestamps: true,
  collection: 'replay_segments',
})
export class ReplaySegment {
  @Prop({ required: true, index: true })
  appId: string

  @Prop({ required: true, index: true })
  timestamp: Date

  @Prop({ required: true, trim: true, index: true })
  segmentId: string

  @Prop({ required: true })
  startedAt: Date

  @Prop({ required: true })
  endedAt: Date

  @Prop({ required: true })
  eventCount: number

  @Prop({ trim: true, index: true })
  route?: string

  @Prop({ trim: true })
  reason?: string

  @Prop({ type: Array, default: [] })
  sample?: Array<Record<string, unknown>>

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  context?: Record<string, unknown>

  @Prop({ trim: true, index: true })
  userId?: string

  @Prop({ trim: true })
  sessionId?: string
}

export const ReplaySegmentSchema = SchemaFactory.createForClass(ReplaySegment)
ReplaySegmentSchema.index({ appId: 1, timestamp: -1 })
ReplaySegmentSchema.index({ appId: 1, segmentId: 1, timestamp: -1 })
