import { apiClient } from './client'

export interface PatientCreateInput {
  national_id: string
  full_name: string
  phone_number: string
  baseline_systolic: number
  baseline_diastolic: number
  baseline_glucose?: number | null
}

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

export interface PrescriptionCreateInput {
  medication_name: string
  dosage: string
  refill_interval_days?: number
}

export const patientsApi = {
  createPatient: async (input: PatientCreateInput): Promise<Patient> => {
    const response = await apiClient.post<Patient>('patients/', input)
    return response.data
  },

  getPatient: async (patientId: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`patients/${patientId}/`)
    return response.data
  },

  addPrescription: async (
    patientId: string,
    input: PrescriptionCreateInput
  ): Promise<PatientPrescription> => {
    const response = await apiClient.post<PatientPrescription>(
      `patients/${patientId}/prescriptions/`,
      input
    )
    return response.data
  },

  deactivatePrescription: async (
    prescriptionId: string
  ): Promise<PatientPrescription> => {
    const response = await apiClient.patch<PatientPrescription>(
      `prescriptions/${prescriptionId}/deactivate/`
    )
    return response.data
  },

  dispensePrescription: async (
    prescriptionId: string
  ): Promise<PatientPrescription> => {
    const response = await apiClient.post<PatientPrescription>(
      `prescriptions/${prescriptionId}/dispense/`
    )
    return response.data
  },
}