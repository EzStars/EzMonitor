import { SetMetadata } from '@nestjs/common'
import { PROJECT_API_KEY_OPTIONAL } from '../constants'

export const ProjectApiKeyOptional = () => SetMetadata(PROJECT_API_KEY_OPTIONAL, true)
