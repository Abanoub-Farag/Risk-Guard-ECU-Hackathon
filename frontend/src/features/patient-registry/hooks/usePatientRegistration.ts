import { useState, type FormEvent } from 'react'
import {
  patientApi,
} from '../services/patient.api'
import type {
  CreatePatientDTO,
  NationalIdParseResult,
  Patient,
  VitalsValidationResult,
} from '../types/patient.types'
import { cleanNationalId, parseEgyptianNationalId } from '../utils/national-id.validator'
import { validateVitals } from '../utils/vitals.validator'

export interface PatientRegistrationFormState {
  nationalId: string
  fullName: string
  phoneNumber: string
  systolic: string
  diastolic: string
  glucose: string
}

export interface UsePatientRegistrationOptions {
  onSuccess?: (patient: Patient) => void
}

export interface UsePatientRegistrationResult {
  form: PatientRegistrationFormState
  parsedId: NationalIdParseResult | null
  vitalsResult: VitalsValidationResult
  nationalIdError?: string
  fieldErrors: Record<string, string>
  apiError: string | null
  isSubmitting: boolean
  isFormValid: boolean
  touched: Record<string, boolean>
  setField: (field: keyof PatientRegistrationFormState, value: string) => void
  markTouched: (field: string) => void
  handleSubmit: (e: FormEvent) => Promise<Patient | undefined>
  resetForm: () => void
}

const initialForm: PatientRegistrationFormState = {
  nationalId: '',
  fullName: '',
  phoneNumber: '',
  systolic: '',
  diastolic: '',
  glucose: '',
}

export const usePatientRegistration = (
  options?: UsePatientRegistrationOptions
): UsePatientRegistrationResult => {
  const [form, setForm] = useState<PatientRegistrationFormState>(initialForm)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = (field: keyof PatientRegistrationFormState, value: string) => {
    setApiError(null)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })

    if (field === 'nationalId') {
      setForm((prev) => ({ ...prev, nationalId: cleanNationalId(value) }))
    } else {
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const parsedId = form.nationalId.length > 0 ? parseEgyptianNationalId(form.nationalId) : null
  const nationalIdError =
    touched.nationalId && form.nationalId.length > 0 && !parsedId?.isValid
      ? parsedId?.error
      : touched.nationalId && form.nationalId.length === 0
      ? 'National ID is required'
      : undefined

  const numSystolic = form.systolic === '' ? null : Number(form.systolic)
  const numDiastolic = form.diastolic === '' ? null : Number(form.diastolic)
  const numGlucose = form.glucose === '' ? null : Number(form.glucose)

  const vitalsResult = validateVitals(numSystolic, numDiastolic, numGlucose)

  const isFormValid = Boolean(
    form.nationalId.length === 14 &&
      parsedId?.isValid &&
      form.fullName.trim().length >= 3 &&
      form.phoneNumber.trim().length >= 8 &&
      numSystolic !== null &&
      numDiastolic !== null &&
      vitalsResult.isValid
  )

  const resetForm = () => {
    setForm(initialForm)
    setTouched({})
    setApiError(null)
    setFieldErrors({})
  }

  const handleSubmit = async (e: FormEvent): Promise<Patient | undefined> => {
    e.preventDefault()

    setTouched({
      nationalId: true,
      fullName: true,
      phoneNumber: true,
      systolic: true,
      diastolic: true,
      glucose: true,
    })

    if (!isFormValid || numSystolic === null || numDiastolic === null) {
      return undefined
    }

    const payload: CreatePatientDTO = {
      national_id: form.nationalId,
      full_name: form.fullName.trim(),
      phone_number: form.phoneNumber.trim(),
      baseline_systolic: numSystolic,
      baseline_diastolic: numDiastolic,
      baseline_glucose:
        numGlucose !== null && !Number.isNaN(numGlucose) ? numGlucose : null,
    }

    setIsSubmitting(true)
    setApiError(null)
    setFieldErrors({})

    try {
      const created = await patientApi.createPatient(payload)
      options?.onSuccess?.(created)
      return created
    } catch (err: unknown) {
      if (err && typeof err === 'object') {
        const message =
          'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Registration failed'
        const fields =
          'fieldErrors' in err &&
          typeof err.fieldErrors === 'object' &&
          err.fieldErrors !== null
            ? (err.fieldErrors as Record<string, string>)
            : {}
        setApiError(message)
        setFieldErrors(fields)
      } else {
        setApiError('An unexpected error occurred')
      }
      return undefined
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    parsedId,
    vitalsResult,
    nationalIdError,
    fieldErrors,
    apiError,
    isSubmitting,
    isFormValid,
    touched,
    setField,
    markTouched,
    handleSubmit,
    resetForm,
  }
}
