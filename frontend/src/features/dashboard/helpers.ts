import type {
  CycleData,
  DashboardOverview,
  PatientTelemetry,
  TriageColor,
} from '../../api/dashboard'
import type { RefillStatus } from '../../api/refills'
import type { VoucherView } from '../../api/vouchers'

export const computeOverviewTotals = (
  overview: DashboardOverview
): DashboardOverview => {
  const total_patients = overview.patients.length
  const active_prescriptions = overview.patients.reduce(
    (n, p) => n + p.active_prescriptions.length,
    0
  )
  const total_cycles = overview.patients.reduce(
    (n, p) => n + p.cycles.length,
    0
  )
  const flagged_cycles = overview.patients.reduce(
    (n, p) => n + flaggedCycles(p.cycles).length,
    0
  )
  return { ...overview, total_patients, active_prescriptions, total_cycles, flagged_cycles }
}

export const isOutOfBand = (value: number, baseline: number): boolean =>
  value < baseline * 0.8 || value > baseline * 1.2

export const isOutOfBandCycle = (
  cycle: CycleData,
  baseline: PatientTelemetry
): boolean => {
  if (
    cycle.systolic !== null &&
    isOutOfBand(cycle.systolic, baseline.baseline_systolic)
  ) {
    return true
  }
  if (
    cycle.diastolic !== null &&
    isOutOfBand(cycle.diastolic, baseline.baseline_diastolic)
  ) {
    return true
  }
  return (
    cycle.glucose !== null &&
    baseline.baseline_glucose !== null &&
    isOutOfBand(cycle.glucose, baseline.baseline_glucose)
  )
}

export const average = (values: (number | null)[]): number | null => {
  const nums = values.filter((value): value is number => value !== null)
  if (nums.length === 0) return null
  const total = nums.reduce((sum, value) => sum + value, 0)
  return Math.round((total / nums.length) * 10) / 10
}

export const flaggedCycles = (cycles: CycleData[]): CycleData[] =>
  cycles.filter((cycle) => cycle.triage_color && cycle.triage_color !== 'GREEN')

export const severeSymptomCycles = (cycles: CycleData[]): CycleData[] =>
  cycles.filter((cycle) => cycle.has_severe_symptoms)

export const formatDate = (value: string | null): string => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatConfidence = (value: number | null): string =>
  value === null ? '—' : `${(value * 100).toFixed(0)}%`

export const formatRange = (
  systolic: number | null,
  diastolic: number | null
): string => {
  if (systolic === null && diastolic === null) return '—'
  return `${systolic ?? '—'}/${diastolic ?? '—'} mmHg`
}

export const formatGlucose = (value: number | null): string =>
  value === null ? '—' : `${value} mg/dL`

export interface IntakeReading {
  systolic: number | null
  diastolic: number | null
  glucose: number | null
  missed_doses_past_week: number
  has_severe_symptoms: boolean
}

export interface TriageVerdict {
  triage_color: TriageColor
  anomaly_reason: string | null
  status: RefillStatus
}

// Mirrors the backend rule chain (triage/services.py) for the mock data path.
export function evaluateTriage(
  reading: IntakeReading,
  baseline: PatientTelemetry,
  previous: CycleData | null
): TriageVerdict {
  const { systolic, diastolic } = reading

  if (systolic === null || diastolic === null) {
    return {
      triage_color: 'RED',
      anomaly_reason: 'PHYSIOLOGICAL_IMPOSSIBILITY',
      status: 'NEEDS_REVIEW',
    }
  }

  const physiologicallyValid =
    systolic >= 70 &&
    systolic <= 240 &&
    diastolic >= 40 &&
    diastolic <= 140 &&
    systolic > diastolic

  if (!physiologicallyValid) {
    return {
      triage_color: 'RED',
      anomaly_reason: 'PHYSIOLOGICAL_IMPOSSIBILITY',
      status: 'NEEDS_REVIEW',
    }
  }

  if (
    previous !== null &&
    previous.systolic === systolic &&
    previous.diastolic === diastolic
  ) {
    return {
      triage_color: 'RED',
      anomaly_reason: 'SUSPECTED_DATA_FABRICATION',
      status: 'NEEDS_REVIEW',
    }
  }

  const outOfBand =
    isOutOfBand(systolic, baseline.baseline_systolic) ||
    isOutOfBand(diastolic, baseline.baseline_diastolic) ||
    (reading.glucose !== null &&
      baseline.baseline_glucose !== null &&
      isOutOfBand(reading.glucose, baseline.baseline_glucose))

  if (outOfBand) {
    return {
      triage_color: 'YELLOW',
      anomaly_reason: 'CLINICAL_VARIANCE_EXCEEDED',
      status: 'NEEDS_REVIEW',
    }
  }

  if (reading.has_severe_symptoms) {
    return {
      triage_color: 'YELLOW',
      anomaly_reason: 'SEVERE_SYMPTOMS_REPORTED',
      status: 'NEEDS_REVIEW',
    }
  }

  return { triage_color: 'GREEN', anomaly_reason: null, status: 'APPROVED' }
}

export interface QueueItem {
  patient: PatientTelemetry
  cycle: CycleData
}

export const reviewQueue = (patients: PatientTelemetry[]): QueueItem[] => {
  const items: QueueItem[] = []
  for (const patient of patients) {
    for (const cycle of patient.cycles) {
      if (cycle.status === 'NEEDS_REVIEW') {
        items.push({ patient, cycle })
      }
    }
  }
  return items.sort(
    (a, b) =>
      new Date(a.cycle.submitted_at).getTime() -
      new Date(b.cycle.submitted_at).getTime()
  )
}

export const maskNationalId = (nationalId: string): string => {
  if (nationalId.length < 8) return '******'
  return `${nationalId.slice(0, 6)}******${nationalId.slice(-2)}`
}

export const makeVoucherCode = (refillId: string): string => {
  let hash = 2166136261
  for (let i = 0; i < refillId.length; i++) {
    hash ^= refillId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `V${hash.toString(36).toUpperCase().padStart(15, '0').slice(-15)}`
}

export const activeVouchers = (patients: PatientTelemetry[]): VoucherView[] => {
  const vouchers: VoucherView[] = []
  for (const patient of patients) {
    for (const cycle of patient.cycles) {
      if (cycle.status !== 'APPROVED' || cycle.dispensed) continue
      vouchers.push({
        code: makeVoucherCode(cycle.refill_id),
        refill_id: cycle.refill_id,
        medication_name:
          patient.active_prescriptions[0]?.medication_name ?? '—',
        dosage: patient.active_prescriptions[0]?.dosage ?? '—',
        patient_name: patient.full_name,
        patient_national_id: patient.national_id,
        masked_national_id: maskNationalId(patient.national_id),
        status: 'ACTIVE',
        expires_at: cycle.submitted_at,
        dispensed_at: null,
      })
    }
  }
  return vouchers
}