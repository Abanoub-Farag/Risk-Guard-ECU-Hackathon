import { apiClient } from './client'

export type RefillStatus =
  | 'SUBMITTED'
  | 'PROCESSED'
  | 'APPROVED'
  | 'NEEDS_REVIEW'
  | 'REJECTED'

export type DeviceType = 'BLOOD_PRESSURE' | 'GLUCOMETER'

export interface DeviceScan {
  id: string
  refill_request_id: string
  device_type: DeviceType
  image_storage_uri: string
  captured_at: string
  created_at: string
}

export interface RefillRequest {
  id: string
  patient_id: string
  prescription_id: string
  status: RefillStatus
  missed_doses_past_week: number
  has_severe_symptoms: boolean
  submitted_at: string
  created_at: string
  updated_at: string
  scans: DeviceScan[]
}

export interface RefillRequestCreateInput {
  patient_id: string
  prescription_id: string
  missed_doses_past_week?: number
  has_severe_symptoms?: boolean
}

export const refillsApi = {
  create: async (input: RefillRequestCreateInput): Promise<RefillRequest> => {
    const response = await apiClient.post<RefillRequest>('refill-requests/', input)
    return response.data
  },

  getById: async (refillId: string): Promise<RefillRequest> => {
    const response = await apiClient.get<RefillRequest>(
      `refill-requests/${refillId}/`
    )
    return response.data
  },

  uploadScan: async (
    refillId: string,
    deviceType: DeviceType,
    file: File
  ): Promise<DeviceScan> => {
    const formData = new FormData()
    formData.append('device_type', deviceType)
    formData.append('file', file)

    const response = await apiClient.post<DeviceScan>(
      `refill-requests/${refillId}/scans/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return response.data
  },

  submitForReview: async (refillId: string): Promise<RefillRequest> => {
    const response = await apiClient.post<RefillRequest>(
      `refill-requests/${refillId}/submit-for-review/`
    )
    return response.data
  },
}