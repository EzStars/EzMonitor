import type { JoinProjectRequestDto, LoginRequestDto, RegisterRequestDto } from './auth.dto'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`)
  }

  return value.trim()
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a string`)
  }

  return value.trim()
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function assertEmailFormat(email: string): void {
  if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
    throw new Error('email format is invalid')
  }
}

function assertPasswordStrength(password: string): void {
  if (password.length < 8 || password.length > 128) {
    throw new Error('password length must be between 8 and 128')
  }

  const hasLetter = /[A-Z]/i.test(password)
  const hasNumber = /\d/.test(password)
  if (!hasLetter || !hasNumber) {
    throw new Error('password must contain both letters and numbers')
  }
}

export function validateRegisterRequestDto(value: unknown): RegisterRequestDto {
  if (!isRecord(value)) {
    throw new Error('body must be an object')
  }

  const email = normalizeEmail(parseRequiredString(value.email, 'email'))
  const password = parseRequiredString(value.password, 'password')
  const name = parseOptionalString(value.name, 'name')
  const projectName = parseOptionalString(value.projectName, 'projectName')
  const appId = parseOptionalString(value.appId, 'appId')

  assertEmailFormat(email)
  assertPasswordStrength(password)

  return {
    email,
    password,
    name,
    projectName,
    appId,
  }
}

export function validateLoginRequestDto(value: unknown): LoginRequestDto {
  if (!isRecord(value)) {
    throw new Error('body must be an object')
  }

  const email = normalizeEmail(parseRequiredString(value.email, 'email'))
  const password = parseRequiredString(value.password, 'password')
  assertEmailFormat(email)

  return {
    email,
    password,
  }
}

export function validateJoinProjectRequestDto(value: unknown): JoinProjectRequestDto {
  if (!isRecord(value)) {
    throw new Error('body must be an object')
  }

  const rawProjectId = parseOptionalString(value.projectId, 'projectId')
  const appId = parseOptionalString(value.appId, 'appId')

  if (!rawProjectId && !appId) {
    throw new Error('projectId or appId is required')
  }

  // Backward compatibility: callers may accidentally pass appId in projectId.
  if (rawProjectId && !/^[a-f\d]{24}$/i.test(rawProjectId) && !appId) {
    return {
      appId: rawProjectId,
    }
  }

  return {
    projectId: rawProjectId,
    appId,
  }
}
