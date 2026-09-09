import type { VitalsValidationErrors, VitalsValidationResult } from '../types/patient.types'

export const validateVitals = (
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
  glucose?: number | null
): VitalsValidationResult => {
  const errors: VitalsValidationErrors = {}

  if (systolic === null || systolic === undefined || Number.isNaN(systolic)) {
    errors.systolic = 'Baseline systolic pressure is required'
  } else if (systolic < 50 || systolic > 300) {
    errors.systolic = `Systolic pressure must be between 50 and 300 mmHg (received ${systolic})`
  }

  if (diastolic === null || diastolic === undefined || Number.isNaN(diastolic)) {
    errors.diastolic = 'Baseline diastolic pressure is required'
  } else if (diastolic < 30 || diastolic > 200) {
    errors.diastolic = `Diastolic pressure must be between 30 and 200 mmHg (received ${diastolic})`
  }

  if (
    systolic !== null &&
    systolic !== undefined &&
    diastolic !== null &&
    diastolic !== undefined &&
    !Number.isNaN(systolic) &&
    !Number.isNaN(diastolic) &&
    systolic >= 50 &&
    systolic <= 300 &&
    diastolic >= 30 &&
    diastolic <= 200
  ) {
    if (systolic <= diastolic) {
      errors.bloodPressure = `Systolic pressure (${systolic}) must be strictly greater than diastolic pressure (${diastolic})`
    }
  }

  if (glucose !== undefined && glucose !== null && !Number.isNaN(glucose)) {
    if (glucose <= 0) {
      errors.glucose = 'Baseline glucose must be strictly greater than 0 mg/dL'
    } else {
      const glucoseString = glucose.toString()
      const decimalSplit = glucoseString.split('.')
      if (decimalSplit[1] && decimalSplit[1].length > 2) {
        errors.glucose = 'Baseline glucose can have at most 2 decimal places'
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
