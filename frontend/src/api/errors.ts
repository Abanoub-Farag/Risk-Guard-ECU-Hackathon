import type { ApiErrorResponse } from './patients'

export interface ApiError {
  detail?: string
  status?: number
  code?: string
  errors?: Record<string, string[] | string> | null
  [field: string]: unknown
}

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: { data?: unknown; status?: number }
    }
    const data = axiosError.response?.data as ApiError | ApiErrorResponse | undefined

    if (data?.detail) {
      return data.detail
    }

    if (data?.errors && typeof data.errors === 'object') {
      const firstErrKey = Object.keys(data.errors)[0]
      if (firstErrKey) {
        const val = data.errors[firstErrKey]
        if (Array.isArray(val) && val.length > 0) return `${firstErrKey}: ${val[0]}`
        if (typeof val === 'string') return `${firstErrKey}: ${val}`
      }
    }

    if (data && typeof data === 'object') {
      const values = Object.values(data)
      const firstValue = values[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

export const getFieldErrors = (error: unknown): Record<string, string> => {
  const result: Record<string, string> = {}
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: { data?: unknown; status?: number }
    }
    const data = axiosError.response?.data as ApiErrorResponse | Record<string, unknown> | undefined

    if (data?.errors && typeof data.errors === 'object') {
      for (const [key, val] of Object.entries(data.errors)) {
        if (Array.isArray(val) && val.length > 0) {
          result[key] = String(val[0])
        } else if (typeof val === 'string') {
          result[key] = val
        }
      }
    } else if (data && typeof data === 'object') {
      for (const [key, val] of Object.entries(data)) {
        if (key === 'detail' || key === 'status' || key === 'title' || key === 'type' || key === 'code') {
          continue
        }
        if (Array.isArray(val) && val.length > 0) {
          result[key] = String(val[0])
        } else if (typeof val === 'string') {
          result[key] = val
        }
      }
    }
  }
  return result
}