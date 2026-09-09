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

export interface CreateRefillRequestDTO {
  patient_id: string
  prescription_id: string
  missed_doses_past_week?: number
  has_severe_symptoms?: boolean
}

export interface UploadDeviceScanDTO {
  refill_id: string
  device_type: DeviceType
  file: File
}

export interface ApiErrorResponse {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  errors?: Record<string, string[]>
}

export interface TimelineValidationResult {
  isBlocked: boolean
  earliestAllowableDate: Date | null
  daysRemaining: number
  formattedEarliestDate: string | null
  reason?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileType?: 'image/jpeg' | 'image/png'
}
