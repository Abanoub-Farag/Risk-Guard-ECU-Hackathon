import { useMemo, useState } from 'react'
import { refillApi, RefillApiError } from '../services/refill.api'
import type {
  DeviceType,
  RefillRequest,
  TimelineValidationResult,
} from '../types/refill.types'
import { validateRefillTimeline } from '../utils/refill-timeline.validator'

export type SubmissionStage =
  | 'idle'
  | 'creating_request'
  | 'uploading_scan'
  | 'submitting_for_review'
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
  file: File | null
  deviceType: DeviceType
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
  submitRefillIntake: (
    fileOrParams: File | null | SubmitRefillIntakeParams,
    deviceType?: DeviceType
  ) => Promise<RefillRequest | null>
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
    fileOrParams: File | null | SubmitRefillIntakeParams,
    directDeviceType?: DeviceType
  ): Promise<RefillRequest | null> => {
    clearErrors()

    let targetPatientId = patientId
    let targetPrescriptionId = prescriptionId
    let targetFile: File | null
    let targetDeviceType: DeviceType = directDeviceType ?? 'BLOOD_PRESSURE'

    if (fileOrParams && 'deviceType' in fileOrParams && ('file' in fileOrParams || 'patientId' in fileOrParams)) {
      const params = fileOrParams as SubmitRefillIntakeParams
      if (params.patientId) targetPatientId = params.patientId
      if (params.prescriptionId) targetPrescriptionId = params.prescriptionId
      targetFile = params.file
      targetDeviceType = params.deviceType
    } else {
      targetFile = fileOrParams as File | null
      if (directDeviceType) targetDeviceType = directDeviceType
    }

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

    if (!targetFile) {
      setApiError('A medical device screen capture image is required prior to submission.')
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

      // Step 2: Upload Device Screen Scan
      setSubmissionStage('uploading_scan')
      await refillApi.uploadDeviceScan(createdRequest.id, targetDeviceType, targetFile)

      // Step 3: Lock into verification queue
      setSubmissionStage('submitting_for_review')
      const finalRequest = await refillApi.submitRefillForReview(createdRequest.id)

      setSubmissionStage('success')
      return finalRequest
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
      submissionStage === 'uploading_scan' ||
      submissionStage === 'submitting_for_review',
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
