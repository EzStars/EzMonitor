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
