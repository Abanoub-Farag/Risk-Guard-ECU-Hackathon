import { useCallback, useEffect, useState } from 'react'
import { patientsApi, type Patient } from '../../../api/patients'
import { getErrorMessage } from '../../../api/errors'

export interface UsePatientResult {
  patient: Patient | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  setPatient: React.Dispatch<React.SetStateAction<Patient | null>>
}

export const usePatient = (patientId: string | undefined): UsePatientResult => {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(patientId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) {
      return
    }

    let ignore = false

    patientsApi
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
          setError(getErrorMessage(err))
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
      const data = await patientsApi.getPatient(patientId)
      setPatient(data)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  return {
    patient,
    loading,
    error,
    refetch,
    setPatient,
  }
}
