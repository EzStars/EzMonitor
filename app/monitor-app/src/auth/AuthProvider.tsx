import type { ReactNode } from 'react'
import { message } from 'antd'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { request } from '../services/api'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_CURRENT_PROJECT_STORAGE_KEY,
  AUTH_PROJECTS_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from './constants'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

export interface ProjectAccess {
  id: string
  name: string
  appId: string
  role: 'owner' | 'admin' | 'viewer'
}

interface AuthSessionResponse {
  accessToken: string
  expiresIn: number
  user: AuthUser
  projects: ProjectAccess[]
  currentProjectId: string
  projectApiKey?: string
}

interface RegisterPayload {
  email: string
  password: string
  name?: string
  projectName?: string
  appId?: string
}

interface LoginPayload {
  email: string
  password: string
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  projects: ProjectAccess[]
  currentProjectId: string | null
  currentProject: ProjectAccess | null
  currentAppId: string | null
  initialized: boolean
  register: (payload: RegisterPayload) => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  switchProject: (projectId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function parseStoredJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

function saveSession(session: AuthSessionResponse): void {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken)
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user))
  localStorage.setItem(AUTH_PROJECTS_STORAGE_KEY, JSON.stringify(session.projects))
  localStorage.setItem(AUTH_CURRENT_PROJECT_STORAGE_KEY, session.currentProjectId)
}

function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  localStorage.removeItem(AUTH_PROJECTS_STORAGE_KEY)
  localStorage.removeItem(AUTH_CURRENT_PROJECT_STORAGE_KEY)
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return {
      token: null as string | null,
      user: null as AuthUser | null,
      projects: [] as ProjectAccess[],
      currentProjectId: null as string | null,
      initialized: true,
    }
  }

  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  const user = parseStoredJson<AuthUser>(localStorage.getItem(AUTH_USER_STORAGE_KEY))
  const projects = parseStoredJson<ProjectAccess[]>(localStorage.getItem(AUTH_PROJECTS_STORAGE_KEY)) ?? []
  const currentProjectId = localStorage.getItem(AUTH_CURRENT_PROJECT_STORAGE_KEY)

  if (!token || !user || projects.length === 0 || !currentProjectId) {
    clearSession()
    return {
      token: null,
      user: null,
      projects: [] as ProjectAccess[],
      currentProjectId: null,
      initialized: true,
    }
  }

  const hasCurrent = projects.some(item => item.id === currentProjectId)
  if (!hasCurrent) {
    clearSession()
    return {
      token: null,
      user: null,
      projects: [] as ProjectAccess[],
      currentProjectId: null,
      initialized: true,
    }
  }

  return {
    token,
    user,
    projects,
    currentProjectId,
    initialized: true,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = getInitialState()
  const [token, setToken] = useState<string | null>(initial.token)
  const [user, setUser] = useState<AuthUser | null>(initial.user)
  const [projects, setProjects] = useState<ProjectAccess[]>(initial.projects)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initial.currentProjectId)
  const [initialized] = useState<boolean>(initial.initialized)

  const applySession = useCallback((session: AuthSessionResponse) => {
    saveSession(session)
    setToken(session.accessToken)
    setUser(session.user)
    setProjects(session.projects)
    setCurrentProjectId(session.currentProjectId)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await request.post<AuthSessionResponse>('/api/auth/register', payload)
    const data = response.data.data
    if (!data) {
      throw new Error('注册响应缺少 data')
    }

    applySession(data)
    message.success('注册成功')
  }, [applySession])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await request.post<Omit<AuthSessionResponse, 'projectApiKey'>>('/api/auth/login', payload)
    const data = response.data.data
    if (!data) {
      throw new Error('登录响应缺少 data')
    }

    applySession({
      ...data,
      projectApiKey: undefined,
    })
    message.success('登录成功')
  }, [applySession])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    setProjects([])
    setCurrentProjectId(null)
  }, [])

  const switchProject = useCallback((projectId: string) => {
    const matched = projects.find(item => item.id === projectId)
    if (!matched) {
      return
    }

    localStorage.setItem(AUTH_CURRENT_PROJECT_STORAGE_KEY, matched.id)
    setCurrentProjectId(matched.id)
  }, [projects])

  const currentProject = useMemo(
    () => projects.find(item => item.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  )
  const currentAppId = currentProject?.appId ?? null

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    projects,
    currentProjectId,
    currentProject,
    currentAppId,
    initialized,
    register,
    login,
    logout,
    switchProject,
  }), [token, user, projects, currentProjectId, currentProject, currentAppId, initialized, register, login, logout, switchProject])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }

  return context
}
