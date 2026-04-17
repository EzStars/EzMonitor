export interface RegisterRequestDto {
  email: string
  password: string
  name?: string
  projectName?: string
  appId?: string
}

export interface LoginRequestDto {
  email: string
  password: string
}

export interface JoinProjectRequestDto {
  projectId?: string
  appId?: string
}
