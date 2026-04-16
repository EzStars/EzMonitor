import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

export type UserDocument = HydratedDocument<User>

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, trim: true, lowercase: true, unique: true, index: true })
  email: string

  @Prop({ trim: true })
  name?: string

  @Prop({ required: true })
  passwordHash: string
}

export const UserSchema = SchemaFactory.createForClass(User)
