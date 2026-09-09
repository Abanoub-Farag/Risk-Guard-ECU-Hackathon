import { useState, useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../../hooks/useData'
import { formatGlucose, formatRange } from '../dashboard/helpers'
import PatientRegistrationForm from './components/PatientRegistrationForm'
import { parseEgyptianNationalId } from './utils/nationalId'
import type { Patient } from '../../api/patients'

export default function PatientsPage(): ReactNode {
  const { overview, loading, error, addPatient } = useData()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const patients = useMemo(() => overview?.patients ?? [], [overview?.patients])

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.national_id.includes(q) ||
        p.phone_number.includes(q)
    )
  }, [patients, search])

  const handleRegistrationSuccess = (newPatient: Patient) => {
    // Also sync with shared mock overview data for seamless client navigation
    addPatient({
      national_id: newPatient.national_id,
      full_name: newPatient.full_name,
      phone_number: newPatient.phone_number,
      baseline_systolic: newPatient.baseline_systolic,
      baseline_diastolic: newPatient.baseline_diastolic,
      baseline_glucose: newPatient.baseline_glucose,
    })

    setShowModal(false)
    setToastMessage(`Patient ${newPatient.full_name} registered successfully.`)
    navigate(`/patients/${newPatient.id}`)
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-white" />
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chronic Patient Registry</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Clinical identity records, baseline vitals, and prescription monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/patients/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register Patient
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            Quick Modal
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, National ID, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredPatients.length} of {patients.length} patients
        </span>
      </div>

      {/* Patient Directory Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Patient
                </th>
                <th scope="col" className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  National ID
                </th>
                <th scope="col" className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Baseline BP
                </th>
                <th scope="col" className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Baseline Glucose
                </th>
                <th scope="col" className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Active Prescriptions
                </th>
                <th scope="col" className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const idInfo = parseEgyptianNationalId(p.national_id)
                  return (
                    <tr
                      key={p.patient_id}
                      className="hover:bg-slate-50/80 transition duration-150"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/patients/${p.patient_id}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline block"
                        >
                          {p.full_name}
                        </Link>
                        <span className="text-xs text-slate-500">{p.phone_number}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-medium text-slate-700 block">
                          {p.national_id}
                        </span>
                        {idInfo.isValid && (
                          <span className="inline-block text-[10px] text-slate-400">
                            {idInfo.governorate} • {idInfo.gender} • {idInfo.age}y
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-800">
                        <span className="font-semibold">
                          {formatRange(p.baseline_systolic, p.baseline_diastolic)}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">mmHg</span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-800">
                        {p.baseline_glucose ? (
                          <>
                            <span className="font-semibold">
                              {formatGlucose(p.baseline_glucose)}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">mg/dL</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          {p.active_prescriptions.length} Active
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {p.active_prescriptions.map((rx) => rx.medication_name).join(', ') ||
                            'None'}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/patients/${p.patient_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                        >
                          <span>Inspect</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-lg font-bold text-slate-900">Register New Patient</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <PatientRegistrationForm
              isModal
              onSuccess={handleRegistrationSuccess}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}