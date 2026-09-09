const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) return envUrl
  return 'http://localhost:8000/api/v1/'
}

export const API_URL = getApiUrl()
export const ACCESS_TOKEN_KEY = 'riskguard_access'
export const REFRESH_TOKEN_KEY = 'riskguard_refresh'