import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RefillStatusBadge } from '../components/RefillStatusBadge'
import { refillApi } from '../services/refill.api'
import type { RefillRequest } from '../types/refill.types'

export function RefillDetailsPage(): ReactNode {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [refill, setRefill] = useState<RefillRequest | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let isMounted = true
    refillApi
      .getRefillRequest(id)
      .then((data) => {
        if (isMounted) {
          setRefill(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load refill request details.'
          )
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const missingIdError = !id ? 'No refill request ID specified.' : null
  const displayError = error ?? missingIdError
  const isLoading = loading && Boolean(id)

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    )
  }

  if (displayError || !refill) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="text-base font-semibold">Error Loading Refill Details</h2>
          <p className="mt-1 text-sm">{displayError ?? 'Refill record could not be found.'}</p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/refill-intake')}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Back to Refill Intake
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Refill Request
            </h1>
            <RefillStatusBadge status={refill.status} />
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            ID: {refill.id}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/refill-intake"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            New Refill Intake
          </Link>
          <Link
            to={`/patients/${refill.patient_id}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            View Patient Profile
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Intake Status
          </span>
          <div className="mt-2">
            <RefillStatusBadge status={refill.status} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Submitted:{' '}
            {new Date(refill.submitted_at || refill.created_at).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Adherence Compliance
          </span>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {refill.missed_doses_past_week === 0
              ? 'Full Adherence'
              : `${refill.missed_doses_past_week} Missed Doses`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Reported over 7 days prior to intake
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Clinical Symptoms Flag
          </span>
          <div className="mt-2 flex items-center gap-2">
            {refill.has_severe_symptoms ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Severe Symptoms Reported
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                No Severe Symptoms
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {refill.has_severe_symptoms
              ? 'Routed to human clinician exception dashboard'
              : 'Cleared for standard automated triage evaluation'}
          </p>
        </div>
      </div>

      {/* Medical Device Screen Ingestion Artifacts */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Ingested Device Screen Captures
          </h2>
          <p className="text-xs text-slate-500">
            Biometric LCD screen captures securely archived in sovereign object storage.
          </p>
        </div>

        {refill.scans && refill.scans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {refill.scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    {scan.device_type === 'BLOOD_PRESSURE'
                      ? 'Blood Pressure Monitor'
                      : 'Glucometer'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(scan.captured_at || scan.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <p className="truncate">
                    <strong className="font-medium text-slate-800">Storage URI:</strong>{' '}
                    <span className="font-mono text-[11px]">{scan.image_storage_uri}</span>
                  </p>
                  <p>
                    <strong className="font-medium text-slate-800">Scan ID:</strong>{' '}
                    <span className="font-mono text-[11px]">{scan.id}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No attached device scans found.
          </div>
        )}
      </div>
    </div>
  )
}
