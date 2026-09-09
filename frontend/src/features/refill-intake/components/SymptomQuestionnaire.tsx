import type { ChangeEvent, ReactNode } from 'react'

interface SymptomQuestionnaireProps {
  missedDoses: number
  hasSevereSymptoms: boolean
  onMissedDosesChange: (doses: number) => void
  onHasSevereSymptomsChange: (hasSymptoms: boolean) => void
  disabled?: boolean
  error?: string
}

export function SymptomQuestionnaire({
  missedDoses,
  hasSevereSymptoms,
  onMissedDosesChange,
  onHasSevereSymptomsChange,
  disabled = false,
  error,
}: SymptomQuestionnaireProps): ReactNode {
  const handleMissedDosesInput = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10)
    onMissedDosesChange(isNaN(parsed) || parsed < 0 ? 0 : parsed)
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Clinical Adherence & Symptom Questionnaire
        </h3>
        <p className="text-xs text-slate-500">
          Self-reported metrics for clinical evaluation and automated triage routing.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="missed-doses-input"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
          >
            Missed Medication Doses (Past 7 Days)
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              id="missed-doses-input"
              type="number"
              min="0"
              max="28"
              value={missedDoses}
              onChange={handleMissedDosesInput}
              disabled={disabled}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="0"
            />
            <span className="text-xs text-slate-500">
              {missedDoses === 0
                ? 'Full compliance reported'
                : `${missedDoses} missed ${missedDoses === 1 ? 'dose' : 'doses'}`}
            </span>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSevereSymptoms}
              onChange={(e) => onHasSevereSymptomsChange(e.target.checked)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-900">
                Patient experiences acute or severe symptoms
              </span>
              <p className="mt-0.5 text-slate-500 leading-relaxed">
                Flags chest pain, acute dizziness, fainting, shortness of breath, or severe hyperglycemia/hypoglycemia.
                Enabling this routes the intake request to clinician exception review.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
