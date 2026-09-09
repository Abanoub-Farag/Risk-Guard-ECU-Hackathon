export type Gender = 'Male' | 'Female'

export type PrescriptionStatus = 'ACTIVE' | 'INACTIVE'

export interface PatientPrescription {
  id: string
  patient_id: string
  medication_name: string
  dosage: string
  refill_interval_days: number
  last_dispensed_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  national_id: string
  full_name: string
  phone_number: string
  baseline_systolic: number
  baseline_diastolic: number
  baseline_glucose: number | null
  created_at: string
  updated_at: string
  active_prescriptions: PatientPrescription[]
}

export interface CreatePatientDTO {
  national_id: string
  full_name: string
  phone_number: string
  baseline_systolic: number
  baseline_diastolic: number
  baseline_glucose?: number | null
}

export interface CreatePrescriptionDTO {
  medication_name: string
  dosage: string
  refill_interval_days?: number
}

export interface ApiErrorResponse {
  type?: string
  title?: string
  status: number
  detail: string
  instance?: string
  code?: string
  errors?: Record<string, string[] | string> | null
}

export interface NationalIdParseResult {
  isValid: boolean
  error?: string
  birthDate?: Date
  birthDateFormatted?: string
  governorateCode?: string
  governorate?: string
  gender?: Gender
  age?: number
}

export interface VitalsValidationErrors {
  systolic?: string
  diastolic?: string
  bloodPressure?: string
  glucose?: string
}

export interface VitalsValidationResult {
  isValid: boolean
  errors: VitalsValidationErrors
}
