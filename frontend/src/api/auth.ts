import { apiClient, clearTokens } from './client'
import type { AuthTokens } from './client'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  email?: string
  first_name?: string
  last_name?: string
}

export interface LoginResponse {
  access: string
  refresh: string
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiClient.post<LoginResponse>(
      'auth/token/',
      credentials
    )
    return response.data
  },

  register: async (credentials: RegisterCredentials): Promise<void> => {
    await apiClient.post('auth/register/', credentials)
  },

  refresh: async (refresh: string): Promise<AuthTokens> => {
    const response = await apiClient.post<LoginResponse>(
      'auth/token/refresh/',
      { refresh }
    )
    return response.data
  },

  verify: async (token: string): Promise<void> => {
    await apiClient.post('auth/token/verify/', { token })
  },

  logout: (): void => {
    clearTokens()
  },
}