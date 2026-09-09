import { apiClient } from './client'
import type { RefillStatus } from './refills'
import mockOverview from '../mock/dashboard'

export type TriageColor = 'GREEN' | 'YELLOW' | 'RED'

export interface CycleData {
  refill_id: string
  submitted_at: string
  systolic: number | null
  diastolic: number | null
  glucose: number | null
  confidence_score: number | null
  triage_color: TriageColor | null
  anomaly_reason: string | null
  status: RefillStatus
  missed_doses_past_week: number
  has_severe_symptoms: boolean
  dispensed: boolean
  dispensed_at: string | null
  review_note: string | null
}

export interface PatientTelemetry {
  patient_id: string
  full_name: string
  national_id: string
  phone_number: string
  baseline_systolic: number
  baseline_diastolic: number
  baseline_glucose: number | null
  active_prescriptions: {
    id: string
    medication_name: string
    dosage: string
    last_dispensed_at: string | null
  }[]
  cycles: CycleData[]
}

export interface DashboardOverview {
  generated_at: string
  total_patients: number
  active_prescriptions: number
  total_cycles: number
  flagged_cycles: number
  patients: PatientTelemetry[]
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const dashboardApi = {
  // Returns collected patient health data for underwriting review.
  // Real endpoint: GET dashboard/overview/ (friend adds it on the backend).
  async getOverview(): Promise<DashboardOverview> {
    if (USE_MOCK) {
      await delay(400)
      return mockOverview
    }
    const response = await apiClient.get<DashboardOverview>('dashboard/overview/')
    return response.data
  },
}