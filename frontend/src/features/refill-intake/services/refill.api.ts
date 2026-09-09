import { apiClient } from '../../../api/client'
import type {
  ApiErrorResponse,
  CreateRefillRequestDTO,
  DeviceScan,
  DeviceType,
  RefillRequest,
} from '../types/refill.types'

export class RefillApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
    code?: string
  ) {
    super(message)
    this.name = 'RefillApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
  }
}

export const normalizeRefillApiError = (error: unknown): RefillApiError => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: { data?: ApiErrorResponse | Record<string, unknown>; status?: number }
    }
    const status = axiosError.response?.status ?? 500
    const data = axiosError.response?.data
    let message = 'An unexpected error occurred while communicating with the server.'
    const fieldErrors: Record<string, string> = {}

    if (data && typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string') {
        message = data.detail
      }

      if ('errors' in data && data.errors && typeof data.errors === 'object') {
        for (const [key, val] of Object.entries(data.errors)) {
          if (Array.isArray(val) && val.length > 0) {
            fieldErrors[key] = String(val[0])
          } else if (typeof val === 'string') {
            fieldErrors[key] = val
          }
        }
      } else {
        for (const [key, val] of Object.entries(data)) {
          if (
            key === 'detail' ||
            key === 'status' ||
            key === 'title' ||
            key === 'type' ||
            key === 'code' ||
            key === 'instance'
          ) {
            continue
          }
          if (Array.isArray(val) && val.length > 0) {
            fieldErrors[key] = String(val[0])
          } else if (typeof val === 'string') {
            fieldErrors[key] = val
          }
        }
      }

      if (!('detail' in data) && Object.keys(fieldErrors).length > 0) {
        const first = Object.entries(fieldErrors)[0]
        if (first) message = `${first[0]}: ${first[1]}`
      }
    }

    const code =
      data && 'code' in data && typeof data.code === 'string' ? data.code : undefined

    return new RefillApiError(message, status, fieldErrors, code)
  }

  if (error instanceof Error) {
    return new RefillApiError(error.message, 0)
  }

  return new RefillApiError('Network connection failed or host unreachable.', 0)
}

export const refillApi = {
  createRefillRequest: async (input: CreateRefillRequestDTO): Promise<RefillRequest> => {
    try {
      const response = await apiClient.post<RefillRequest>('refill-requests/', input)
      return response.data
    } catch (err) {
      throw normalizeRefillApiError(err)
    }
  },

  getRefillRequest: async (refillId: string): Promise<RefillRequest> => {
    try {
      const response = await apiClient.get<RefillRequest>(`refill-requests/${refillId}/`)
      return response.data
    } catch (err) {
      throw normalizeRefillApiError(err)
    }
  },

  uploadDeviceScan: async (
    refillId: string,
    deviceType: DeviceType,
    file: File
  ): Promise<DeviceScan> => {
    try {
      const formData = new FormData()
      formData.append('device_type', deviceType)
      formData.append('file', file)

      const response = await apiClient.post<DeviceScan>(
        `refill-requests/${refillId}/scans/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    } catch (err) {
      throw normalizeRefillApiError(err)
    }
  },

  submitRefillForReview: async (refillId: string): Promise<RefillRequest> => {
    try {
      const response = await apiClient.post<RefillRequest>(
        `refill-requests/${refillId}/submit-for-review/`
      )
      return response.data
    } catch (err) {
      throw normalizeRefillApiError(err)
    }
  },
}
