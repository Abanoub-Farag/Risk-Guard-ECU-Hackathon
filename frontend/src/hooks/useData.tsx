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
  type DashboardOverview,
} from '../api/dashboard'
import { getErrorMessage } from '../api/errors'
import type { VoucherView } from '../api/vouchers'
import {
  activeVouchers,
  type IntakeReading,
  type TriageVerdict,
} from '../features/dashboard/helpers'
import { apiClient } from '../api/client'

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
  addPatient: (input: PatientCreateInput) => void
  addPrescription: (patientId: string, input: PrescriptionInput) => void
  addCycle: (patientId: string, reading: IntakeReading) => TriageVerdict | null
  decide: (cycleId: string, decision: 'APPROVE' | 'REJECT', note: string) => Promise<void>
  redeemVoucher: (code: string, nationalId: string) => Promise<RedeemResult>
  refresh: () => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await dashboardApi.getOverview()
      setOverview(data)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    let ignored = false
    dashboardApi
      .getOverview()
      .then((data) => {
        if (!ignored) {
          setLoading(false)
          setError(null)
          setOverview(data)
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
  }, [])

  const addPatient = useCallback((_input: PatientCreateInput): void => {
    // Triggers refresh since actual API is handled in components
    void refresh()
  }, [refresh])

  const addPrescription = useCallback((_patientId: string, _input: PrescriptionInput) => {
    // Triggers refresh since actual API is handled in components
    void refresh()
  }, [refresh])

  const addCycle = useCallback((_patientId: string, _reading: IntakeReading): TriageVerdict | null => {
    // Triggers refresh since actual API is handled in components
    void refresh()
    return null
  }, [refresh])

  const decide = useCallback(
    async (cycleId: string, decision: 'APPROVE' | 'REJECT', note: string) => {
      try {
        await apiClient.post(`refill-requests/${cycleId}/adjudicate`, {
          decision,
          clinical_notes: note,
          rejection_reason_category: decision === 'REJECT' ? 'CLINICAL_CONTRAINDICATION' : null
        })
        await refresh()
      } catch (err) {
        console.error(err)
        throw err
      }
    },
    [refresh]
  )

  const vouchers = useMemo(
    () => (overview ? activeVouchers(overview.patients) : []),
    [overview]
  )

  const redeemVoucher = useCallback(
    async (code: string, nationalId: string): Promise<RedeemResult> => {
      try {
        await apiClient.post('vouchers/redeem', {
          voucher_code: code,
          national_id: nationalId,
          dispensing_pharmacy_id: 'HACKATHON_DEMO_PHARMACY'
        })
        await refresh()
        return { ok: true, message: 'Voucher redeemed successfully.' }
      } catch (err) {
        return { ok: false, message: getErrorMessage(err) }
      }
    },
    [refresh]
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
        refresh,
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