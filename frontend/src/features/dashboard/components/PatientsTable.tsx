import type { ReactNode } from 'react'
import type { PatientTelemetry } from '../../../api/dashboard'
import {
  average,
  flaggedCycles,
  formatDate,
  formatGlucose,
  formatRange,
  severeSymptomCycles,
} from '../helpers'
import TriageBadge from './TriageBadge'

interface PatientsTableProps {
  patients: PatientTelemetry[]
  onSelect: (patient: PatientTelemetry) => void
}

export default function PatientsTable({
  patients,
  onSelect,
}: PatientsTableProps): ReactNode {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {[
                'Patient',
                'National ID',
                'Active Rx',
                'Baseline BP',
                'Avg Glucose',
                'Cycles',
                'Flagged',
                'Severe Symptoms',
                'Last Cycle',
                'Last Triage',
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
            {patients.map((patient) => {
              const cycles = [...patient.cycles].sort(
                (a, b) =>
                  new Date(b.submitted_at).getTime() -
                  new Date(a.submitted_at).getTime()
              )
              const last = cycles[0] ?? null
              const avgGlucose = average(cycles.map((c) => c.glucose))
              const lastTriage =
                cycles.find((c) => c.triage_color !== null)?.triage_color ?? null
              return (
                <tr
                  key={patient.patient_id}
                  onClick={() => onSelect(patient)}
                  className="cursor-pointer hover:bg-blue-50/60"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {patient.full_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {patient.phone_number}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                    {patient.national_id}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {patient.active_prescriptions.length}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatRange(
                      patient.baseline_systolic,
                      patient.baseline_diastolic
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatGlucose(avgGlucose)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {patient.cycles.length}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        flaggedCycles(patient.cycles).length > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {flaggedCycles(patient.cycles).length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {severeSymptomCycles(patient.cycles).length}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatDate(last?.submitted_at ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <TriageBadge color={lastTriage} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}