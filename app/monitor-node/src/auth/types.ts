import type { Request } from 'express'

export type ProjectRole = 'owner' | 'admin' | 'viewer'

export interface AuthTokenPayload {
  sub: string
  email: string
  iat: number
  exp: number
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthTokenPayload
}

export interface UserProfile {
  id: string
  email: string
  name?: string
}

export interface ProjectAccess {
  id: string
  name: string
  appId: string
  role: ProjectRole
}

export interface AuthSessionPayload {
  accessToken: string
  expiresIn: number
  user: UserProfile
  projects: ProjectAccess[]
  currentProjectId: string
  projectApiKey?: string
}

export interface ProjectScopeResult {
  appIds: string[]
  selectedAppId: string
  selectedProjectId: string
  projects: ProjectAccess[]
}
