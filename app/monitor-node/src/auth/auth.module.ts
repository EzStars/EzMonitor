import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { Project, ProjectMember, ProjectMemberSchema, ProjectSchema, User, UserSchema } from './schemas'
import { AuthService, CryptoService, JwtService } from './services'

@Module({
  controllers: [AuthController],
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectMember.name, schema: ProjectMemberSchema },
    ]),
  ],
  providers: [AuthService, CryptoService, JwtService, AuthGuard],
  exports: [AuthService, CryptoService, JwtService, AuthGuard, MongooseModule],
})
export class AuthModule {}
