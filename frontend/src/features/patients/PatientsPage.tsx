import { useState, type FormEvent, type ReactNode } from 'react'
import { useData, type PatientCreateInput } from '../../hooks/useData'
import { formatGlucose, formatRange } from '../dashboard/helpers'

const emptyForm: PatientCreateInput = {
  national_id: '',
  full_name: '',
  phone_number: '',
  baseline_systolic: 0,
  baseline_diastolic: 0,
  baseline_glucose: null,
}

export default function PatientsPage(): ReactNode {
  const { overview, loading, error, addPatient, addPrescription } = useData()

  const [form, setForm] = useState<PatientCreateInput>(emptyForm)
  const [message, setMessage] = useState<string | null>(null)

  const [rxPatientId, setRxPatientId] = useState<string>('')
  const [rxMed, setRxMed] = useState('')
  const [rxDosage, setRxDosage] = useState('')

  const set = <K extends keyof PatientCreateInput>(
    key: K,
    value: PatientCreateInput[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const ok = addPatient(form)
    setMessage(
      ok
        ? `تم تسجيل ${form.full_name} بنجاح.`
        : 'الرقم القومي مستخدم بالفعل لمريض تاني.'
    )
    if (ok) setForm(emptyForm)
  }

  const handleRxSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!rxPatientId || !rxMed || !rxDosage) return
    addPrescription(rxPatientId, {
      medication_name: rxMed,
      dosage: rxDosage,
    })
    setRxMed('')
    setRxDosage('')
    setMessage('تمت إضافة الروشتة بنجاح.')
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-white" />
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>
  }

  const patients = overview?.patients ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Patients</h1>
        <p className="mt-1 text-sm text-slate-500">
          Register chronic patients and their active prescriptions.
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Register patient</h2>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              National ID (14 digits)
            </label>
            <input
              value={form.national_id}
              onChange={(e) => set('national_id', e.target.value)}
              required
              minLength={14}
              maxLength={14}
              pattern="\d{14}"
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Phone</label>
            <input
              value={form.phone_number}
              onChange={(e) => set('phone_number', e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Baseline systolic
              </label>
              <input
                type="number"
                value={form.baseline_systolic || ''}
                onChange={(e) =>
                  set('baseline_systolic', Number(e.target.value))
                }
                required
                min={50}
                max={300}
                placeholder="120"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Baseline diastolic
              </label>
              <input
                type="number"
                value={form.baseline_diastolic || ''}
                onChange={(e) =>
                  set('baseline_diastolic', Number(e.target.value))
                }
                required
                min={30}
                max={200}
                placeholder="80"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Baseline glucose
              </label>
              <input
                type="number"
                value={form.baseline_glucose ?? ''}
                onChange={(e) =>
                  set(
                    'baseline_glucose',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                min={1}
                placeholder="100"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Register patient
          </button>
        </form>

        <form
          onSubmit={handleRxSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Add prescription
          </h2>
          {patients.length === 0 ? (
            <p className="text-sm text-slate-500">
              Register a patient first to add a prescription.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Patient
                </label>
                <select
                  value={rxPatientId}
                  onChange={(e) => setRxPatientId(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select patient…</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Medication name
                </label>
                <input
                  value={rxMed}
                  onChange={(e) => setRxMed(e.target.value)}
                  required
                  placeholder="Metformin 500mg"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Dosage
                </label>
                <input
                  value={rxDosage}
                  onChange={(e) => setRxDosage(e.target.value)}
                  required
                  placeholder="قرص مرتين يوميا"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add prescription
              </button>
            </>
          )}
        </form>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {[
                  'Patient',
                  'National ID',
                  'Baseline BP',
                  'Baseline Glucose',
                  'Active Rx',
                  'Cycles',
                ].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-4 py-3 font-medium text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.patient_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {p.active_prescriptions.map((rx) => rx.medication_name).join(', ') ||
                        'No prescriptions'}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {p.national_id}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatRange(p.baseline_systolic, p.baseline_diastolic)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatGlucose(p.baseline_glucose)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.active_prescriptions.length}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.cycles.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}