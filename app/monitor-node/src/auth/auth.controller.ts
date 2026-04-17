import type { AuthSessionPayload, AuthTokenPayload } from './types'
import { BadRequestException, Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { AuthRequired, CurrentUser } from './decorators'
import { validateJoinProjectRequestDto, validateLoginRequestDto, validateRegisterRequestDto } from './dto'
import { AuthService } from './services'

@Controller('api/auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  @AuthRequired()
  async me(@CurrentUser() user: AuthTokenPayload): Promise<{ success: true, data: Omit<AuthSessionPayload, 'projectApiKey'> }> {
    const context = await this.authService.getCurrentUserContext(user.sub)
    return {
      success: true,
      data: {
        user: context.user,
        projects: context.projects,
        currentProjectId: context.currentProjectId,
        accessToken: '',
        expiresIn: 0,
      },
    }
  }

  @Get('projects')
  @AuthRequired()
  async projects(@CurrentUser() user: AuthTokenPayload): Promise<{ success: true, data: { projects: AuthSessionPayload['projects'] } }> {
    const context = await this.authService.getCurrentUserContext(user.sub)
    return {
      success: true,
      data: { projects: context.projects },
    }
  }

  @Post('register')
  async register(@Body() body: unknown): Promise<{ success: true, data: AuthSessionPayload }> {
    const dto = this.parseDto(validateRegisterRequestDto, body, 'Invalid register payload')
    const data = await this.authService.register(dto)
    return {
      success: true,
      data,
    }
  }

  @Post('login')
  async login(@Body() body: unknown): Promise<{ success: true, data: Omit<AuthSessionPayload, 'projectApiKey'> }> {
    const dto = this.parseDto(validateLoginRequestDto, body, 'Invalid login payload')
    const data = await this.authService.login(dto)
    const { projectApiKey: _projectApiKey, ...safeData } = data
    return {
      success: true,
      data: safeData,
    }
  }

  @Post('projects/join')
  @AuthRequired()
  async joinProject(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: unknown,
  ): Promise<{ success: true, data: { projects: AuthSessionPayload['projects'], currentProjectId: string } }> {
    const dto = this.parseDto(validateJoinProjectRequestDto, body, 'Invalid join project payload')
    const data = await this.authService.joinProject(user.sub, dto)
    return {
      success: true,
      data,
    }
  }

  private parseDto<T>(parser: (value: unknown) => T, value: unknown, message: string): T {
    try {
      return parser(value)
    }
    catch {
      throw new BadRequestException(message)
    }
  }
}
