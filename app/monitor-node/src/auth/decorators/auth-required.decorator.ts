import { SetMetadata } from '@nestjs/common'
import { AUTH_REQUIRED } from '../constants'

export const AuthRequired = () => SetMetadata(AUTH_REQUIRED, true)
