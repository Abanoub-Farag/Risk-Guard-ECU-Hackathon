import { useMemo } from 'react'
import type { Patient } from '../types/patient.types'
import { parseEgyptianNationalId } from '../utils/national-id.validator'

export interface PatientSummaryCardProps {
  patient: Patient
}

export default function PatientSummaryCard({ patient }: PatientSummaryCardProps) {
  const parsedId = useMemo(
    () => parseEgyptianNationalId(patient.national_id),
    [patient.national_id]
  )

  const isHypertensive =
    patient.baseline_systolic >= 140 || patient.baseline_diastolic >= 90

  return (
    <div
      data-testid="patient-summary-card"
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl shadow-md">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{patient.full_name}</h1>
              {parsedId.gender && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {parsedId.gender}
                </span>
              )}
              {parsedId.age !== undefined && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {parsedId.age} yrs old
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <div className="flex items-center gap-1 font-mono">
                <span className="text-slate-400">ID:</span>
                <span className="font-semibold text-slate-700">{patient.national_id}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Phone:</span>
                <span className="font-semibold text-slate-700">{patient.phone_number}</span>
              </div>
              {parsedId.governorate && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Gov:</span>
                  <span className="font-semibold text-slate-700">{parsedId.governorate}</span>
                </div>
              )}
              {parsedId.birthDateFormatted && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">DOB:</span>
                  <span className="font-semibold text-slate-700">{parsedId.birthDateFormatted}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Baseline Vitals */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
          {/* Blood Pressure Anchor */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 min-w-[140px]">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Baseline BP
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {patient.baseline_systolic}/{patient.baseline_diastolic}
              </span>
              <span className="text-xs text-slate-500">mmHg</span>
            </div>
            <span
              className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isHypertensive
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isHypertensive ? 'Hypertensive Baseline' : 'Controlled Baseline'}
            </span>
          </div>

          {/* Fasting Glucose Anchor */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 min-w-[140px]">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Baseline Glucose
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {patient.baseline_glucose ?? '—'}
              </span>
              {patient.baseline_glucose !== null && (
                <span className="text-xs text-slate-500">mg/dL</span>
              )}
            </div>
            <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
              {patient.baseline_glucose ? 'Fasting Target' : 'Not Recorded'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
