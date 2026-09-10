import { useMemo, useState } from 'react'
import { refillApi, RefillApiError } from '../services/refill.api'
import { triageApi } from '../../../api/triage'
import type {
  RefillRequest,
  TimelineValidationResult,
} from '../types/refill.types'
import { validateRefillTimeline } from '../utils/refill-timeline.validator'

export type SubmissionStage =
  | 'idle'
  | 'creating_request'
  | 'submitting_telemetry'
  | 'success'
  | 'error'

export interface UseRefillIntakeOptions {
  initialPatientId?: string
  initialPrescriptionId?: string
  selectedPrescriptionLastDispensedAt?: string | null
}

export interface SubmitRefillIntakeParams {
  patientId?: string
  prescriptionId?: string
  systolic: number
  diastolic: number
  glucose?: number | null
}

export interface UseRefillIntakeReturn {
  patientId: string
  prescriptionId: string
  missedDoses: number
  hasSevereSymptoms: boolean
  submissionStage: SubmissionStage
  isSubmitting: boolean
  apiError: string | null
  fieldErrors: Record<string, string>
  timelineValidation: TimelineValidationResult
  setPatientId: (id: string) => void
  setPrescriptionId: (id: string) => void
  setMissedDoses: (doses: number) => void
  setHasSevereSymptoms: (val: boolean) => void
  clearErrors: () => void
  submitRefillIntake: (params: SubmitRefillIntakeParams) => Promise<RefillRequest | null>
}

export function useRefillIntake(
  options: UseRefillIntakeOptions = {}
): UseRefillIntakeReturn {
  const [patientId, setPatientId] = useState<string>(options.initialPatientId ?? '')
  const [prescriptionId, setPrescriptionId] = useState<string>(options.initialPrescriptionId ?? '')
  const [missedDoses, setMissedDoses] = useState<number>(0)
  const [hasSevereSymptoms, setHasSevereSymptoms] = useState<boolean>(false)
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>('idle')
  const [apiError, setApiError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const timelineValidation = useMemo(
    () => validateRefillTimeline(options.selectedPrescriptionLastDispensedAt),
    [options.selectedPrescriptionLastDispensedAt]
  )

  const clearErrors = () => {
    setApiError(null)
    setFieldErrors({})
  }

  const submitRefillIntake = async (
    params: SubmitRefillIntakeParams
  ): Promise<RefillRequest | null> => {
    clearErrors()

    const targetPatientId = params.patientId || patientId
    const targetPrescriptionId = params.prescriptionId || prescriptionId

    if (!targetPatientId) {
      setApiError('Please select a patient.')
      return null
    }

    if (!targetPrescriptionId) {
      setApiError('Please select an active prescription.')
      return null
    }

    if (timelineValidation.isBlocked) {
      setApiError(
        timelineValidation.reason ??
          'Early refill request blocked. 25-day guardrail active.'
      )
      return null
    }

    if (!params.systolic || !params.diastolic) {
      setApiError('Systolic and diastolic readings are required.')
      return null
    }

    try {
      // Step 1: Create Refill Request
      setSubmissionStage('creating_request')
      const createdRequest = await refillApi.createRefillRequest({
        patient_id: targetPatientId,
        prescription_id: targetPrescriptionId,
        missed_doses_past_week: missedDoses,
        has_severe_symptoms: hasSevereSymptoms,
      })

      // Step 2: Submit Telemetry & Evaluate Triage
      setSubmissionStage('submitting_telemetry')
      await triageApi.processIntake(createdRequest.id, {
        systolic: params.systolic,
        diastolic: params.diastolic,
        glucose: params.glucose,
      })

      setSubmissionStage('success')
      return createdRequest
    } catch (err) {
      setSubmissionStage('error')
      if (err instanceof RefillApiError || ('fieldErrors' in (err as object))) {
        const error = err as RefillApiError
        setApiError(error.message)
        setFieldErrors(error.fieldErrors ?? {})
      } else if (err instanceof Error) {
        setApiError(err.message)
      } else {
        setApiError('Failed to submit refill request. Please try again.')
      }
      return null
    }
  }

  return {
    patientId,
    prescriptionId,
    missedDoses,
    hasSevereSymptoms,
    submissionStage,
    isSubmitting:
      submissionStage === 'creating_request' ||
      submissionStage === 'submitting_telemetry',
    apiError,
    fieldErrors,
    timelineValidation,
    setPatientId,
    setPrescriptionId,
    setMissedDoses,
    setHasSevereSymptoms,
    clearErrors,
    submitRefillIntake,
  }
}
