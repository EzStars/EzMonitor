import type { HydratedDocument } from 'mongoose'
import type { ProjectRole } from '../types'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

const PROJECT_ROLES: ProjectRole[] = ['owner', 'admin', 'viewer']

export type ProjectMemberDocument = HydratedDocument<ProjectMember>

@Schema({
  timestamps: true,
  collection: 'project_members',
})
export class ProjectMember {
  @Prop({ required: true, trim: true, index: true })
  projectId: string

  @Prop({ required: true, trim: true, index: true })
  userId: string

  @Prop({ required: true, enum: PROJECT_ROLES, default: 'viewer', index: true })
  role: ProjectRole
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember)
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true })
