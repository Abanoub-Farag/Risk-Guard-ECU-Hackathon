import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ACCESS_TOKEN_KEY, API_URL, REFRESH_TOKEN_KEY } from './config'

export interface AuthTokens {
  access: string
  refresh: string
}

let refreshPromise: Promise<string | null> | null = null

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_TOKEN_KEY)

const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_TOKEN_KEY)

const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise

  const refresh = getRefreshToken()
  if (!refresh) return null

  refreshPromise = apiClient
    .post<AuthTokens>('auth/token/refresh/', { refresh })
    .then((response: AxiosResponse<AuthTokens>) => {
      setTokens(response.data)
      return response.data.access
    })
    .catch(() => {
      clearTokens()
      return null
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export { apiClient, clearTokens, getAccessToken, getRefreshToken, setTokens }