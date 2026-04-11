import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

export type ProjectDocument = HydratedDocument<Project>

@Schema({
  timestamps: true,
  collection: 'projects',
})
export class Project {
  @Prop({ required: true, trim: true, index: true })
  name: string

  @Prop({ required: true, trim: true, unique: true, index: true })
  appId: string

  @Prop({ trim: true, index: true })
  ownerUserId: string

  @Prop({ required: true, trim: true, unique: true, index: true })
  apiKeyHash: string

  @Prop({ default: true, index: true })
  enabled: boolean
}

export const ProjectSchema = SchemaFactory.createForClass(Project)
