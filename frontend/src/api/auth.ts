import { apiClient, clearTokens } from './client'
import type { AuthTokens } from './client'

export interface LoginCredentials {
  email: string
  password: string
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