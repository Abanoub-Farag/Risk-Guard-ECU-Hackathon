import { useState, type FormEvent, type ReactNode } from 'react'
import { useData } from '../../hooks/useData'
import { maskNationalId } from '../dashboard/helpers'

interface FoundVoucher {
  code: string
  patient_name: string
  medication_name: string
  dosage: string
  patient_national_id: string
}

export default function PharmacyPage(): ReactNode {
  const { vouchers, loading, error, redeemVoucher } = useData()
  const [code, setCode] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [found, setFound] = useState<FoundVoucher | null>(null)
  const [receipt, setReceipt] = useState<FoundVoucher | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-white" />
  if (error)
    return <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>

  const handleLookup = (e: FormEvent) => {
    e.preventDefault()
    setIsError(false)
    setMessage(null)
    setReceipt(null)
    const match = vouchers.find((v) => v.code === code.trim())
    if (!match) {
      setFound(null)
      setMessage('Voucher not found or already redeemed.')
      setIsError(true)
      return
    }
    setFound({
      code: match.code,
      patient_name: match.patient_name,
      medication_name: match.medication_name,
      dosage: match.dosage,
      patient_national_id: match.patient_national_id,
    })
  }

  const handleRedeem = (e: FormEvent) => {
    e.preventDefault()
    if (!found) return
    setIsError(false)
    setMessage(null)
    const result = redeemVoucher(found.code, nationalId.trim())
    if (!result.ok) {
      setMessage(result.message)
      setIsError(true)
      return
    }
    setReceipt(found)
    setFound(null)
    setCode('')
    setNationalId('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pharmacy — POS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verify and redeem a patient's dispensing voucher.
        </p>
      </div>

      <form
        onSubmit={found ? handleRedeem : handleLookup}
        className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Voucher code
          </label>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setFound(null)
              setReceipt(null)
              setMessage(null)
            }}
            required
            minLength={16}
            maxLength={16}
            placeholder="V000000000000000"
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
          />
        </div>

        {found && (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p>
                <span className="font-medium">Patient:</span>{' '}
                {found.patient_name}
              </p>
              <p>
                <span className="font-medium">Medication:</span>{' '}
                {found.medication_name}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Patient National ID (14 digits)
              </label>
              <input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                required
                minLength={14}
                maxLength={14}
                pattern="\d{14}"
                placeholder="29007231400192"
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {found ? 'Redeem voucher' : 'Lookup'}
        </button>
      </form>

      {message && (
        <div
          className={`max-w-lg rounded-xl p-6 text-sm ${
            isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </div>
      )}

      {receipt && (
        <div className="max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-900">
            Redemption receipt
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-emerald-700">Patient</dt>
              <dd className="font-medium text-emerald-900">
                {receipt.patient_name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-emerald-700">National ID</dt>
              <dd className="font-mono text-emerald-900">
                {maskNationalId(receipt.patient_national_id)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-emerald-700">Medication</dt>
              <dd className="font-medium text-emerald-900">
                {receipt.medication_name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-emerald-700">Dosage</dt>
              <dd className="text-emerald-900">{receipt.dosage}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-emerald-700">Voucher code</dt>
              <dd className="font-mono text-emerald-900">{receipt.code}</dd>
            </div>
          </dl>
        </div>
      )}

      {vouchers.length > 0 && (
        <div className="max-w-lg rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Active vouchers
          </h2>
          <ul className="mt-3 space-y-2">
            {vouchers.map((v) => (
              <li
                key={v.code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <span className="font-mono text-xs text-slate-600">
                  {v.code}
                </span>
                <span className="text-slate-500">
                  {v.patient_name} — {v.medication_name}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  {v.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}