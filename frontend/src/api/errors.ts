export interface ApiError {
  detail?: string
  [field: string]: unknown
}

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: { data?: unknown }
    }
    const data = axiosError.response?.data as ApiError | undefined
    if (data?.detail) return data.detail

    if (data) {
      const firstValue = Object.values(data)[0]
      if (typeof firstValue === 'string') return firstValue
    }
  }
  return 'An unexpected error occurred'
}