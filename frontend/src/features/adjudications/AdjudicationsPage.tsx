import { useState, type FormEvent, type ReactNode } from 'react'
import { useData } from '../../hooks/useData'
import {
  formatDate,
  formatGlucose,
  formatRange,
  reviewQueue,
} from '../dashboard/helpers'
import TriageBadge from '../dashboard/components/TriageBadge'

export default function AdjudicationsPage(): ReactNode {
  const { overview, loading, error, decide } = useData()
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-white" />
  if (error)
    return <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>

  const queue = overview ? reviewQueue(overview.patients) : []

  const handleDecide = async (cycleId: string, decision: 'APPROVE' | 'REJECT', e: FormEvent) => {
    e.preventDefault()
    try {
      await decide(cycleId, decision, note)
      setMessage(decision === 'APPROVE' ? 'Approved — voucher issued.' : 'Rejected — patient notified.')
      setSelectedCycleId(null)
      setNote('')
    } catch (err) {
      // error is logged in useData, but we could also show a toast here
      setMessage('Failed to submit decision.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Review Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cases flagged by triage for clinician review.
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-500">No cases pending review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(({ patient, cycle }) => {
            const isOpen = selectedCycleId === cycle.refill_id
            return (
              <div
                key={cycle.refill_id}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <TriageBadge color={cycle.triage_color} />
                      <span className="font-medium text-slate-900">
                        {patient.full_name}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(cycle.submitted_at)} • national ID:{' '}
                      {patient.national_id}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedCycleId(isOpen ? null : cycle.refill_id)
                    }
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {isOpen ? 'Close' : 'Review'}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">BP</p>
                    <p className="font-medium text-slate-900">
                      {formatRange(cycle.systolic, cycle.diastolic)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Glucose</p>
                    <p className="font-medium text-slate-900">
                      {formatGlucose(cycle.glucose)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Missed doses</p>
                    <p className="font-medium text-slate-900">
                      {cycle.missed_doses_past_week}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Submitted</p>
                    <p className="font-medium text-slate-900">
                      {formatDate(cycle.submitted_at)}
                    </p>
                  </div>
                </div>

                {cycle.anomaly_reason && (
                  <p className="mt-3 text-xs text-amber-700">
                    Anomaly: {cycle.anomaly_reason.replace(/_/g, ' ')}
                  </p>
                )}

                {cycle.has_severe_symptoms && (
                  <p className="mt-1 text-xs text-red-600">Severe symptoms reported.</p>
                )}

                {isOpen && (
                  <form
                    className="mt-5 space-y-4 border-t border-slate-100 pt-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                    }}
                  >
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Clinical note
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        required
                        minLength={10}
                        placeholder="Explain clinical reasoning (min 10 chars)…"
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleDecide(cycle.refill_id, 'APPROVE', e)}
                        disabled={!note.trim() || note.length < 10}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDecide(cycle.refill_id, 'REJECT', e)}
                        disabled={!note.trim() || note.length < 10}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-slate-300"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}