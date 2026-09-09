import { Link, useNavigate } from 'react-router-dom'
import PatientRegistrationForm from './components/PatientRegistrationForm'
import type { Patient } from '../../api/patients'

export default function PatientRegistrationPage() {
  const navigate = useNavigate()

  const handleSuccess = (patient: Patient) => {
    navigate(`/patients/${patient.id}`, {
      state: { registered: true, fullName: patient.full_name },
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/patients"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="Back to Patients"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Patient Registration</h1>
            <p className="text-xs text-slate-500">
              Register a chronic patient profile into RiskGuard Registry
            </p>
          </div>
        </div>
      </div>

      <PatientRegistrationForm
        onSuccess={handleSuccess}
        onCancel={() => navigate('/patients')}
      />
    </div>
  )
}
