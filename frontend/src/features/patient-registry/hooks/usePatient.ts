import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  patientApi,
  PatientApiError,
} from '../services/patient.api'
import type {
  CreatePrescriptionDTO,
  Patient,
  PatientPrescription,
} from '../types/patient.types'

export interface UsePatientResult {
  patient: Patient | null
  prescriptions: PatientPrescription[]
  loading: boolean
  rxSubmitting: boolean
  actionLoadingId: string | null
  error: string | null
  rxError: string | null
  rxFieldErrors: Record<string, string>
  refetch: () => Promise<void>
  addPrescription: (dto: CreatePrescriptionDTO) => Promise<PatientPrescription>
  deactivatePrescription: (prescriptionId: string) => Promise<PatientPrescription>
  setPatient: React.Dispatch<React.SetStateAction<Patient | null>>
}

export const usePatient = (patientId: string | undefined): UsePatientResult => {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(patientId))
  const [error, setError] = useState<string | null>(null)

  const [rxSubmitting, setRxSubmitting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [rxError, setRxError] = useState<string | null>(null)
  const [rxFieldErrors, setRxFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!patientId) {
      return
    }

    let ignore = false

    patientApi
      .getPatient(patientId)
      .then((data) => {
        if (!ignore) {
          setPatient(data)
          setLoading(false)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load patient record')
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [patientId])

  const refetch = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await patientApi.getPatient(patientId)
      setPatient(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load patient record')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const prescriptions = useMemo(
    () => patient?.active_prescriptions || [],
    [patient?.active_prescriptions]
  )

  const addPrescription = async (
    dto: CreatePrescriptionDTO
  ): Promise<PatientPrescription> => {
    if (!patientId) {
      throw new Error('No patient selected')
    }

    setRxError(null)
    setRxFieldErrors({})

    const normalizedNewName = dto.medication_name.trim().toLowerCase()
    const duplicate = prescriptions.find(
      (rx) => rx.is_active && rx.medication_name.trim().toLowerCase() === normalizedNewName
    )

    if (duplicate) {
      const msg = `An active prescription for "${dto.medication_name.trim()}" already exists for this patient.`
      setRxError(msg)
      setRxFieldErrors({ medication_name: msg })
      throw new Error(msg)
    }

    setRxSubmitting(true)
    try {
      const created = await patientApi.addPrescription(patientId, dto)
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              active_prescriptions: [created, ...(prev.active_prescriptions || [])],
            }
          : prev
      )
      return created
    } catch (err: unknown) {
      if (err instanceof PatientApiError) {
        setRxError(err.message)
        setRxFieldErrors(err.fieldErrors)
      } else if (err instanceof Error) {
        setRxError(err.message)
      }
      throw err
    } finally {
      setRxSubmitting(false)
    }
  }

  const deactivatePrescription = async (
    prescriptionId: string
  ): Promise<PatientPrescription> => {
    setRxError(null)
    setActionLoadingId(prescriptionId)
    try {
      const updated = await patientApi.deactivatePrescription(prescriptionId)
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              active_prescriptions: (prev.active_prescriptions || []).map((rx) =>
                rx.id === updated.id ? updated : rx
              ),
            }
          : prev
      )
      return updated
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate prescription'
      setRxError(msg)
      throw err
    } finally {
      setActionLoadingId(null)
    }
  }

  return {
    patient,
    prescriptions,
    loading,
    rxSubmitting,
    actionLoadingId,
    error,
    rxError,
    rxFieldErrors,
    refetch,
    addPrescription,
    deactivatePrescription,
    setPatient,
  }
}
