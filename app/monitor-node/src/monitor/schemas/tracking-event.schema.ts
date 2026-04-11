import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Schema as MongooseSchema } from 'mongoose'

export type TrackingEventDocument = HydratedDocument<TrackingEvent>

@Schema({
  timestamps: true,
  collection: 'tracking_events',
})
export class TrackingEvent {
  @Prop({ required: true, index: true })
  appId: string

  @Prop({ required: true, index: true })
  timestamp: Date

  @Prop({ required: true, trim: true, index: true })
  eventName: string

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  properties: Record<string, unknown>

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  context: Record<string, unknown>

  @Prop({ index: true })
  userId?: string
}

export const TrackingEventSchema = SchemaFactory.createForClass(TrackingEvent)
TrackingEventSchema.index({ appId: 1, timestamp: -1 })
TrackingEventSchema.index({ appId: 1, eventName: 1, timestamp: -1 })
