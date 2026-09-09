import type { ReactNode } from 'react'
import type { CycleData, PatientTelemetry } from '../../../api/dashboard'
import {
  formatConfidence,
  formatDate,
  formatGlucose,
  formatRange,
  isOutOfBandCycle,
} from '../helpers'
import TriageBadge from './TriageBadge'

function ReadingCell({
  label,
  value,
  outOfBand,
}: {
  label: string
  value: string
  outOfBand: boolean
}): ReactNode {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-sm font-semibold ${
          outOfBand ? 'text-amber-600' : 'text-slate-900'
        }`}
      >
        {value}
        {outOfBand && <span className="ml-1 text-xs">▲ out of range</span>}
      </p>
    </div>
  )
}

export default function PatientDetail({
  patient,
  onClose,
}: {
  patient: PatientTelemetry
  onClose: () => void
}): ReactNode {
  const cycles = [...patient.cycles].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  )

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {patient.full_name}
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Baseline: {formatRange(patient.baseline_systolic, patient.baseline_diastolic)}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {patient.national_id} • {patient.phone_number}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      {patient.active_prescriptions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {patient.active_prescriptions.map((rx) => (
            <span
              key={rx.id}
              className="inline-block rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
            >
              {rx.medication_name} — {rx.dosage}
              {rx.last_dispensed_at &&
                ` • last dispensed ${formatDate(rx.last_dispensed_at)}`}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">
          Collected Health Data — per refill cycle
        </h3>
        <div className="mt-3 space-y-3">
          {cycles.map((cycle: CycleData) => {
            const outOfBand = isOutOfBandCycle(cycle, patient)
            return (
              <div
                key={cycle.refill_id}
                className={`rounded-lg border p-4 ${
                  outOfBand
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TriageBadge color={cycle.triage_color} />
                    <span className="text-xs text-slate-500">
                      {formatDate(cycle.submitted_at)}
                    </span>
                    {cycle.dispensed && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        dispensed
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    OCR confidence {formatConfidence(cycle.confidence_score)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ReadingCell
                    label="Blood pressure"
                    value={formatRange(cycle.systolic, cycle.diastolic)}
                    outOfBand={
                      (cycle.systolic !== null &&
                        (cycle.systolic < patient.baseline_systolic * 0.8 ||
                          cycle.systolic > patient.baseline_systolic * 1.2)) ||
                      (cycle.diastolic !== null &&
                        (cycle.diastolic < patient.baseline_diastolic * 0.8 ||
                          cycle.diastolic > patient.baseline_diastolic * 1.2))
                    }
                  />
                  <ReadingCell
                    label="Glucose"
                    value={formatGlucose(cycle.glucose)}
                    outOfBand={
                      cycle.glucose !== null &&
                      patient.baseline_glucose !== null &&
                      (cycle.glucose < patient.baseline_glucose * 0.8 ||
                        cycle.glucose > patient.baseline_glucose * 1.2)
                    }
                  />
                  <div>
                    <p className="text-xs text-slate-500">Missed doses</p>
                    <p
                      className={`text-sm font-semibold ${
                        cycle.missed_doses_past_week > 0
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {cycle.missed_doses_past_week} / week
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Severe symptoms</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {cycle.has_severe_symptoms ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {outOfBand && (
                  <p className="mt-3 text-xs text-amber-700">
                    Reading deviates beyond ±20% of this patient's baseline
                    values — the variation is captured for underwriting review.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}