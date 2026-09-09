import { useState } from 'react'
import {
  patientsApi,
  type CreatePrescriptionDTO,
  type PatientPrescription,
} from '../../../api/patients'
import { getErrorMessage, getFieldErrors } from '../../../api/errors'

export interface UsePrescriptionsResult {
  addPrescription: (
    patientId: string,
    dto: CreatePrescriptionDTO,
    currentPrescriptions?: PatientPrescription[]
  ) => Promise<PatientPrescription>
  deactivatePrescription: (
    prescriptionId: string
  ) => Promise<PatientPrescription>
  loading: boolean
  actionLoadingId: string | null
  error: string | null
  fieldErrors: Record<string, string>
  resetErrors: () => void
}

export const usePrescriptions = (
  onPrescriptionAdded?: (prescription: PatientPrescription) => void,
  onPrescriptionUpdated?: (prescription: PatientPrescription) => void
): UsePrescriptionsResult => {
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const resetErrors = () => {
    setError(null)
    setFieldErrors({})
  }

  const addPrescription = async (
    patientId: string,
    dto: CreatePrescriptionDTO,
    currentPrescriptions: PatientPrescription[] = []
  ): Promise<PatientPrescription> => {
    resetErrors()

    const normalizedNewName = dto.medication_name.trim().toLowerCase()
    const duplicateActive = currentPrescriptions.find(
      (rx) =>
        rx.is_active && rx.medication_name.trim().toLowerCase() === normalizedNewName
    )

    if (duplicateActive) {
      const msg = `An active prescription for "${dto.medication_name.trim()}" already exists for this patient.`
      setError(msg)
      setFieldErrors({ medication_name: msg })
      throw new Error(msg)
    }

    setLoading(true)
    try {
      const created = await patientsApi.addPrescription(patientId, dto)
      onPrescriptionAdded?.(created)
      return created
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      const fields = getFieldErrors(err)
      setError(message)
      setFieldErrors(fields)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deactivatePrescription = async (
    prescriptionId: string
  ): Promise<PatientPrescription> => {
    resetErrors()
    setActionLoadingId(prescriptionId)
    try {
      const updated = await patientsApi.deactivatePrescription(prescriptionId)
      onPrescriptionUpdated?.(updated)
      return updated
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(message)
      throw err
    } finally {
      setActionLoadingId(null)
    }
  }

  return {
    addPrescription,
    deactivatePrescription,
    loading,
    actionLoadingId,
    error,
    fieldErrors,
    resetErrors,
  }
}
