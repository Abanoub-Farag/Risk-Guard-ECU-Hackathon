// Styles
import './styles/patient-registry.css'

// Types
export * from './types/patient.types'

// Validators
export {
  cleanNationalId,
  isLeapYear,
  getDaysInMonth,
  parseEgyptianNationalId,
  EGYPTIAN_GOVERNORATES,
} from './utils/national-id.validator'

export { validateVitals } from './utils/vitals.validator'

// Services
export { patientApi, PatientApiError } from './services/patient.api'

// Hooks
export { usePatient } from './hooks/usePatient'
export { usePatientRegistration } from './hooks/usePatientRegistration'

// Components
export { default as NationalIdInput } from './components/NationalIdInput'
export { default as BiometricInputGroup } from './components/BiometricInputGroup'
export { default as PatientSummaryCard } from './components/PatientSummaryCard'
export { default as PrescriptionRow } from './components/PrescriptionRow'
export { default as PrescriptionList } from './components/PrescriptionList'
export { default as AddPrescriptionModal } from './components/AddPrescriptionModal'

// Pages
export { default as PatientRegistrationPage } from './pages/PatientRegistrationPage'
export { default as PatientProfilePage } from './pages/PatientProfilePage'
export { default as PatientsDirectoryPage } from './pages/PatientsDirectoryPage'
