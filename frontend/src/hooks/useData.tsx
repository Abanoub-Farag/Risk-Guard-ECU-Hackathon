import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  dashboardApi,
  type CycleData,
  type DashboardOverview,
  type PatientTelemetry,
} from '../api/dashboard'
import { getErrorMessage } from '../api/errors'
import type { VoucherView } from '../api/vouchers'
import {
  activeVouchers,
  computeOverviewTotals,
  evaluateTriage,
  type IntakeReading,
  type TriageVerdict,
} from '../features/dashboard/helpers'

const STORAGE_KEY = 'riskguard_data_v1'

export interface PatientCreateInput {
  national_id: string
  full_name: string
  phone_number: string
  baseline_systolic: number
  baseline_diastolic: number
  baseline_glucose: number | null
}

export interface PrescriptionInput {
  medication_name: string
  dosage: string
}

export interface RedeemResult {
  ok: boolean
  message: string
}

interface DataContextValue {
  overview: DashboardOverview | null
  loading: boolean
  error: string | null
  vouchers: VoucherView[]
  addPatient: (input: PatientCreateInput) => boolean
  addPrescription: (patientId: string, input: PrescriptionInput) => void
  addCycle: (patientId: string, reading: IntakeReading) => TriageVerdict | null
  decide: (cycleId: string, decision: 'APPROVE' | 'REJECT', note: string) => void
  redeemVoucher: (code: string, nationalId: string) => RedeemResult
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [overview, setOverview] = useState<DashboardOverview | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return computeOverviewTotals(JSON.parse(raw) as DashboardOverview)
      }
    } catch {
      // ignore corrupted storage
    }
    return null
  })
  const [loading, setLoading] = useState<boolean>(overview === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (overview !== null) return
    let ignored = false
    dashboardApi
      .getOverview()
      .then((data) => {
        if (!ignored) {
          setLoading(false)
          setError(null)
          setOverview(computeOverviewTotals(data))
        }
      })
      .catch((err) => {
        if (!ignored) {
          setLoading(false)
          setError(getErrorMessage(err))
        }
      })
    return () => {
      ignored = true
    }
  }, [overview])

  useEffect(() => {
    if (overview === null) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overview))
    } catch {
      // storage unavailable
    }
  }, [overview])

  const apply = useCallback(
    (updater: (prev: DashboardOverview) => DashboardOverview) => {
      setOverview((prev) =>
        prev ? computeOverviewTotals(updater(prev)) : prev
      )
    },
    []
  )

  const addPatient = useCallback(
    (input: PatientCreateInput): boolean => {
      const exists = overview?.patients.some(
        (p) => p.national_id === input.national_id
      )
      if (exists) return false
      const patient: PatientTelemetry = {
        patient_id: crypto.randomUUID(),
        full_name: input.full_name,
        national_id: input.national_id,
        phone_number: input.phone_number,
        baseline_systolic: input.baseline_systolic,
        baseline_diastolic: input.baseline_diastolic,
        baseline_glucose: input.baseline_glucose,
        active_prescriptions: [],
        cycles: [],
      }
      apply((prev) => ({ ...prev, patients: [...prev.patients, patient] }))
      return true
    },
    [apply, overview]
  )

  const addPrescription = useCallback(
    (patientId: string, input: PrescriptionInput) => {
      apply((prev) => ({
        ...prev,
        patients: prev.patients.map((p) =>
          p.patient_id === patientId
            ? {
                ...p,
                active_prescriptions: [
                  ...p.active_prescriptions,
                  {
                    id: crypto.randomUUID(),
                    medication_name: input.medication_name,
                    dosage: input.dosage,
                    last_dispensed_at: null,
                  },
                ],
              }
            : p
        ),
      }))
    },
    [apply]
  )

  const addCycle = useCallback(
    (patientId: string, reading: IntakeReading): TriageVerdict | null => {
      const patient = overview?.patients.find((p) => p.patient_id === patientId)
      if (!patient) return null

      const previous = patient.cycles.length
        ? [...patient.cycles].sort(
            (a, b) =>
              new Date(b.submitted_at).getTime() -
              new Date(a.submitted_at).getTime()
          )[0]
        : null

      const verdict = evaluateTriage(reading, patient, previous)
      const cycle: CycleData = {
        refill_id: crypto.randomUUID(),
        submitted_at: new Date().toISOString(),
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        glucose: reading.glucose,
        triage_color: verdict.triage_color,
        anomaly_reason: verdict.anomaly_reason,
        status: verdict.status,
        missed_doses_past_week: reading.missed_doses_past_week,
        has_severe_symptoms: reading.has_severe_symptoms,
        dispensed: false,
        dispensed_at: null,
        review_note: null,
      }
      apply((prev) => ({
        ...prev,
        patients: prev.patients.map((p) =>
          p.patient_id === patientId
            ? { ...p, cycles: [...p.cycles, cycle] }
            : p
        ),
      }))
      return verdict
    },
    [apply, overview]
  )

  const decide = useCallback(
    (cycleId: string, decision: 'APPROVE' | 'REJECT', note: string) => {
      const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      apply((prev) => ({
        ...prev,
        patients: prev.patients.map((p) => ({
          ...p,
          cycles: p.cycles.map((c) =>
            c.refill_id === cycleId
              ? { ...c, status: newStatus, review_note: note }
              : c
          ),
        })),
      }))
    },
    [apply]
  )

  const vouchers = useMemo(
    () => (overview ? activeVouchers(overview.patients) : []),
    [overview]
  )

  const redeemVoucher = useCallback(
    (code: string, nationalId: string): RedeemResult => {
      if (!overview) return { ok: false, message: 'Data not loaded yet.' }
      const voucher = vouchers.find((v) => v.code === code)
      if (!voucher) {
        return { ok: false, message: 'Voucher not found or already redeemed.' }
      }
      if (voucher.patient_national_id !== nationalId) {
        return {
          ok: false,
          message: 'National ID does not match this voucher.',
        }
      }
      const dispensedAt = new Date().toISOString()
      apply((prev) => ({
        ...prev,
        patients: prev.patients.map((p) => ({
          ...p,
          cycles: p.cycles.map((c) =>
            c.refill_id === voucher.refill_id
              ? { ...c, dispensed: true, dispensed_at: dispensedAt }
              : c
          ),
        })),
      }))
      return { ok: true, message: 'Voucher redeemed successfully.' }
    },
    [apply, overview, vouchers]
  )

  return (
    <DataContext.Provider
      value={{
        overview,
        loading,
        error,
        vouchers,
        addPatient,
        addPrescription,
        addCycle,
        decide,
        redeemVoucher,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}