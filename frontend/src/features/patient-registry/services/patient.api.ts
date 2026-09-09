import { apiClient } from '../../../api/client'
import type {
  ApiErrorResponse,
  CreatePatientDTO,
  CreatePrescriptionDTO,
  Patient,
  PatientPrescription,
} from '../types/patient.types'

export class PatientApiError extends Error {
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
    this.name = 'PatientApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
  }
}

export const normalizeApiError = (error: unknown): PatientApiError => {
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

    return new PatientApiError(message, status, fieldErrors, code)
  }

  if (error instanceof Error) {
    return new PatientApiError(error.message, 0)
  }

  return new PatientApiError('Network connection failed or host unreachable.', 0)
}

export const patientApi = {
  createPatient: async (input: CreatePatientDTO): Promise<Patient> => {
    try {
      const response = await apiClient.post<Patient>('patients/', input)
      return response.data
    } catch (err) {
      throw normalizeApiError(err)
    }
  },

  getPatient: async (patientId: string): Promise<Patient> => {
    try {
      const response = await apiClient.get<Patient>(`patients/${patientId}/`)
      return response.data
    } catch (err) {
      throw normalizeApiError(err)
    }
  },

  addPrescription: async (
    patientId: string,
    input: CreatePrescriptionDTO
  ): Promise<PatientPrescription> => {
    try {
      const response = await apiClient.post<PatientPrescription>(
        `patients/${patientId}/prescriptions/`,
        input
      )
      return response.data
    } catch (err) {
      throw normalizeApiError(err)
    }
  },

  deactivatePrescription: async (
    prescriptionId: string
  ): Promise<PatientPrescription> => {
    try {
      const response = await apiClient.patch<PatientPrescription>(
        `prescriptions/${prescriptionId}/deactivate/`
      )
      return response.data
    } catch (err) {
      throw normalizeApiError(err)
    }
  },
}
