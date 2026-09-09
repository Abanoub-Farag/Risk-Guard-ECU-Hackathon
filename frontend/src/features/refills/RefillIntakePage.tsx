import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useData } from '../../hooks/useData'
import { formatGlucose, formatRange, type IntakeReading, type TriageVerdict } from '../dashboard/helpers'

const emptyReading: IntakeReading = {
  systolic: 0,
  diastolic: 0,
  glucose: null,
  missed_doses_past_week: 0,
  has_severe_symptoms: false,
}

const verdictStyles: Record<string, { label: string; classes: string }> = {
  GREEN: { label: 'Stable — Approved', classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  YELLOW: { label: 'Flagged — Needs Review', classes: 'bg-amber-50 text-amber-800 border-amber-200' },
  RED: { label: 'Critical — Needs Review', classes: 'bg-red-50 text-red-800 border-red-200' },
}

export default function RefillIntakePage(): ReactNode {
  const { overview, loading, error, addCycle } = useData()

  const [patientId, setPatientId] = useState<string>('')
  const [reading, setReading] = useState<IntakeReading>(emptyReading)
  const [verdict, setVerdict] = useState<TriageVerdict | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const patient = useMemo(
    () => overview?.patients.find((p) => p.patient_id === patientId) ?? null,
    [overview, patientId]
  )

  const set = <K extends keyof IntakeReading>(
    key: K,
    value: IntakeReading[K]
  ) => {
    setReading((prev) => ({ ...prev, [key]: value }))
    setVerdict(null)
    setMessage(null)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!patientId) return
    const v = addCycle(patientId, reading)
    if (v) {
      setVerdict(v)
      setMessage(
        v.status === 'APPROVED'
          ? 'Cycle approved and voucher ready for pharmacy.'
          : 'Cycle submitted for doctor review.'
      )
      setReading(emptyReading)
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-white" />
  if (error)
    return <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>

  const patients = overview?.patients ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Refill Intake</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit a patient's refill readings for triage and review.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl space-y-5 rounded-xl bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs text-slate-500">Patient</label>
          <select
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value)
              setVerdict(null)
              setMessage(null)
            }}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.full_name} — {p.national_id}
              </option>
            ))}
          </select>
        </div>

        {patient && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Baseline values</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              BP:{' '}
              {formatRange(patient.baseline_systolic, patient.baseline_diastolic)}{' '}
              {patient.baseline_glucose !== null && (
                <>• Glucose: {formatGlucose(patient.baseline_glucose)}</>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Systolic (mmHg)
            </label>
            <input
              type="number"
              value={reading.systolic || ''}
              onChange={(e) => set('systolic', Number(e.target.value))}
              required
              min={50}
              max={300}
              placeholder="120"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Diastolic (mmHg)
            </label>
            <input
              type="number"
              value={reading.diastolic || ''}
              onChange={(e) => set('diastolic', Number(e.target.value))}
              required
              min={30}
              max={200}
              placeholder="80"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Glucose (mg/dL, optional)
            </label>
            <input
              type="number"
              value={reading.glucose ?? ''}
              onChange={(e) =>
                set(
                  'glucose',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              min={1}
              placeholder="100"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Missed doses (past week)
            </label>
            <input
              type="number"
              value={reading.missed_doses_past_week || ''}
              onChange={(e) =>
                set('missed_doses_past_week', Number(e.target.value))
              }
              min={0}
              max={7}
              placeholder="0"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="col-span-full sm:col-span-1">
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={reading.has_severe_symptoms}
                onChange={(e) => set('has_severe_symptoms', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Severe symptoms</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!patientId}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          Submit cycle
        </button>
      </form>

      {message && (
        <div className="max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">{message}</p>
          {verdict && (
            <div className={`mt-3 inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold ${verdictStyles[verdict.triage_color].classes}`}>
              {verdictStyles[verdict.triage_color].label}
            </div>
          )}
        </div>
      )}
    </div>
  )
}