import type { Model } from 'mongoose'
import type { LoginRequestDto, RegisterRequestDto } from '../dto'
import type { Project, ProjectMember, User } from '../schemas'
import type { AuthSessionPayload, AuthTokenPayload, ProjectAccess, ProjectRole, ProjectScopeResult, UserProfile } from '../types'
import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Project as ProjectEntity, ProjectMember as ProjectMemberEntity, User as UserEntity } from '../schemas'
import { CryptoService } from './crypto.service'
import { JwtService } from './jwt.service'

interface CurrentProjectResolution {
  projectId: string
  appId: string
  role: ProjectRole
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserEntity.name)
    private readonly userModel: Model<User>,
    @InjectModel(ProjectEntity.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(ProjectMemberEntity.name)
    private readonly projectMemberModel: Model<ProjectMember>,
    @Inject(CryptoService)
    private readonly cryptoService: CryptoService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterRequestDto): Promise<AuthSessionPayload> {
    const exists = await this.userModel.findOne({ email: dto.email }).lean().exec()
    if (exists) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password)
    const createdUser = await this.userModel.create({
      email: dto.email,
      name: dto.name?.trim() || undefined,
      passwordHash,
    })

    const userId = this.getStringId(createdUser._id)
    const now = Date.now()
    const projectName = dto.projectName?.trim() || `${dto.email.split('@')[0] || 'my'}-project`
    const fallbackAppId = dto.appId?.trim() || this.generateDefaultAppId(dto.email, now)
    const project = await this.createProjectForOwner(userId, projectName, fallbackAppId)
    await this.ensureOwnerMembership(userId, project.projectId)

    return this.buildAuthSession({
      userId,
      email: dto.email,
      name: dto.name,
      currentProjectId: project.projectId,
      projectApiKey: project.apiKey,
    })
  }

  async login(dto: LoginRequestDto): Promise<AuthSessionPayload> {
    const user = await this.userModel.findOne({ email: dto.email }).lean().exec()
    if (!user) {
      throw new UnauthorizedException('Invalid email or password')
    }

    const valid = await this.cryptoService.verifyPassword(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password')
    }

    return this.buildAuthSession({
      userId: this.getStringId(user._id),
      email: user.email,
      name: user.name,
    })
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    return this.jwtService.verify(token)
  }

  async getCurrentUserContext(userId: string): Promise<{
    user: UserProfile
    projects: ProjectAccess[]
    currentProjectId: string
  }> {
    const user = await this.userModel.findById(userId).lean().exec()
    if (!user) {
      throw new UnauthorizedException('User is not found')
    }

    const projects = await this.getUserProjectAccess(userId)
    if (!projects.length) {
      throw new UnauthorizedException('No accessible project')
    }

    return {
      user: {
        id: this.getStringId(user._id),
        email: user.email,
        name: user.name,
      },
      projects,
      currentProjectId: projects[0].id,
    }
  }

  async getReadableAppIds(userId: string, requestedAppId?: string): Promise<string[]> {
    if (requestedAppId) {
      const scope = await this.resolveProjectScope(userId, requestedAppId)
      return [scope.selectedAppId]
    }

    const projects = await this.getUserProjectAccess(userId)
    if (!projects.length) {
      throw new UnauthorizedException('No accessible project')
    }

    return projects.map(item => item.appId)
  }

  async resolveProjectScope(
    userId: string,
    requestedAppId?: string,
    requestedProjectId?: string,
  ): Promise<ProjectScopeResult> {
    const projects = await this.getUserProjectAccess(userId)
    if (!projects.length) {
      throw new UnauthorizedException('No accessible project')
    }

    const resolved = this.pickCurrentProject(projects, requestedAppId, requestedProjectId)
    return {
      appIds: projects.map(item => item.appId),
      selectedAppId: resolved.appId,
      selectedProjectId: resolved.projectId,
      projects,
    }
  }

  async assertProjectWriteAccess(appId: string, apiKey: string): Promise<Project> {
    if (!appId.trim()) {
      throw new BadRequestException('appId is required')
    }
    if (!apiKey.trim()) {
      throw new UnauthorizedException('Project API key is required')
    }

    const project = await this.projectModel.findOne({ appId: appId.trim(), enabled: true }).exec()
    if (!project) {
      throw new UnauthorizedException('Project is not found or disabled')
    }

    const hashedApiKey = this.cryptoService.hashApiKey(apiKey.trim())
    if (hashedApiKey !== project.apiKeyHash) {
      throw new UnauthorizedException('Invalid project API key')
    }

    return project
  }

  private async buildAuthSession(input: {
    userId: string
    email: string
    name?: string
    currentProjectId?: string
    projectApiKey?: string
  }): Promise<AuthSessionPayload> {
    const projects = await this.getUserProjectAccess(input.userId)
    if (!projects.length) {
      throw new UnauthorizedException('No accessible project')
    }

    const currentProject = projects.find(project => project.id === input.currentProjectId) ?? projects[0]
    const token = this.jwtService.sign({
      sub: input.userId,
      email: input.email,
    })

    return {
      accessToken: token,
      expiresIn: this.jwtService.getExpiresInSeconds(),
      user: {
        id: input.userId,
        email: input.email,
        name: input.name,
      },
      projects,
      currentProjectId: currentProject.id,
      projectApiKey: input.projectApiKey,
    }
  }

  private async createProjectForOwner(
    ownerUserId: string,
    name: string,
    preferredAppId: string,
  ): Promise<{ projectId: string, appId: string, apiKey: string }> {
    const appId = await this.ensureUniqueAppId(preferredAppId)
    const preId = `${ownerUserId}-${Date.now()}`
    const apiKey = this.cryptoService.generateApiKey(preId)
    const apiKeyHash = this.cryptoService.hashApiKey(apiKey)
    const project = await this.projectModel.create({
      name,
      appId,
      ownerUserId,
      apiKeyHash,
      enabled: true,
    })

    return {
      projectId: this.getStringId(project._id),
      appId: project.appId,
      apiKey,
    }
  }

  private async ensureOwnerMembership(userId: string, projectId: string): Promise<void> {
    await this.projectMemberModel.updateOne(
      { userId, projectId },
      { $set: { userId, projectId, role: 'owner' as const } },
      { upsert: true },
    ).exec()
  }

  private async getUserProjectAccess(userId: string): Promise<ProjectAccess[]> {
    const memberships = await this.projectMemberModel.find({ userId }).lean().exec()
    if (!memberships.length) {
      return []
    }

    const projectIds = memberships.map(item => item.projectId).filter(Boolean)
    const projects = await this.projectModel.find({ _id: { $in: projectIds }, enabled: true }).lean().exec()
    const projectById = new Map<string, { _id?: unknown, name: string, appId: string }>()
    for (const project of projects) {
      projectById.set(this.getStringId(project._id), project)
    }

    const access: ProjectAccess[] = []
    for (const member of memberships) {
      const project = projectById.get(member.projectId)
      if (!project) {
        continue
      }

      access.push({
        id: this.getStringId(project._id),
        name: project.name,
        appId: project.appId,
        role: member.role,
      })
    }

    return access
  }

  private pickCurrentProject(
    projects: ProjectAccess[],
    requestedAppId?: string,
    requestedProjectId?: string,
  ): CurrentProjectResolution {
    if (requestedProjectId) {
      const matched = projects.find(project => project.id === requestedProjectId)
      if (matched) {
        return {
          projectId: matched.id,
          appId: matched.appId,
          role: matched.role,
        }
      }

      throw new UnauthorizedException('Requested project is not accessible')
    }

    if (requestedAppId) {
      const matched = projects.find(project => project.appId === requestedAppId)
      if (matched) {
        return {
          projectId: matched.id,
          appId: matched.appId,
          role: matched.role,
        }
      }

      throw new UnauthorizedException('Requested appId is not accessible')
    }

    const first = projects[0]
    return {
      projectId: first.id,
      appId: first.appId,
      role: first.role,
    }
  }

  private async ensureUniqueAppId(baseAppId: string): Promise<string> {
    const normalized = baseAppId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      || 'ezmonitor-app'
    let candidate = normalized
    let suffix = 1

    while (await this.projectModel.exists({ appId: candidate })) {
      suffix += 1
      candidate = `${normalized}-${suffix}`
    }

    return candidate
  }

  private generateDefaultAppId(email: string, now: number): string {
    const base = email.split('@')[0]?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'project'
    return `${base}-${now.toString(36)}`
  }

  private getStringId(value: unknown): string {
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    if (value && typeof value === 'object' && typeof (value as { toString: () => string }).toString === 'function') {
      return (value as { toString: () => string }).toString()
    }

    throw new Error('Invalid object id')
  }
}
