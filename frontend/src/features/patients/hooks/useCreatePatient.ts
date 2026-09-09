import { useState } from 'react'
import { patientsApi, type CreatePatientDTO, type Patient } from '../../../api/patients'
import { getErrorMessage, getFieldErrors } from '../../../api/errors'

export interface UseCreatePatientResult {
  createPatient: (dto: CreatePatientDTO) => Promise<Patient>
  loading: boolean
  error: string | null
  fieldErrors: Record<string, string>
  resetErrors: () => void
}

export const useCreatePatient = (): UseCreatePatientResult => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const resetErrors = () => {
    setError(null)
    setFieldErrors({})
  }

  const createPatient = async (dto: CreatePatientDTO): Promise<Patient> => {
    setLoading(true)
    resetErrors()
    try {
      const newPatient = await patientsApi.createPatient(dto)
      return newPatient
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

  return {
    createPatient,
    loading,
    error,
    fieldErrors,
    resetErrors,
  }
}
