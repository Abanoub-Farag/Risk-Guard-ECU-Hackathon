import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { DataProvider } from './hooks/useData'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import {
  PatientsDirectoryPage,
  PatientRegistrationPage,
  PatientProfilePage,
} from './features/patient-registry'
import RefillIntakePage from './features/refills/RefillIntakePage'
import AdjudicationsPage from './features/adjudications/AdjudicationsPage'
import PharmacyPage from './features/pharmacy/PharmacyPage'

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientsDirectoryPage />} />
              <Route path="/patients/new" element={<PatientRegistrationPage />} />
              <Route path="/patients/:id" element={<PatientProfilePage />} />
              <Route path="/refill-intake" element={<RefillIntakePage />} />
              <Route path="/review-queue" element={<AdjudicationsPage />} />
              <Route path="/pharmacy" element={<PharmacyPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
  )
}