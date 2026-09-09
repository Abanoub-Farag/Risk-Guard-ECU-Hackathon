import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatientRegistrationPage from '../pages/PatientRegistrationPage'
import { patientApi, PatientApiError } from '../services/patient.api'
import type { Patient } from '../types/patient.types'

// Mock patientApi
vi.mock('../services/patient.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/patient.api')>()
  return {
    ...actual,
    patientApi: {
      ...actual.patientApi,
      createPatient: vi.fn(),
    },
  }
})

describe('PatientRegistrationPage Integration Test', () => {
  const mockPatient: Patient = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    national_id: '28505140101235',
    full_name: 'Dr. Tarek Omar',
    phone_number: '01012345678',
    baseline_systolic: 125,
    baseline_diastolic: 82,
    baseline_glucose: 98.5,
    created_at: '2026-09-09T10:00:00Z',
    updated_at: '2026-09-09T10:00:00Z',
    active_prescriptions: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderPage = (props: React.ComponentProps<typeof PatientRegistrationPage> = {}) => {
    return render(
      <MemoryRouter>
        <PatientRegistrationPage {...props} />
      </MemoryRouter>
    )
  }

  it('renders with submit button initially disabled', () => {
    renderPage({ isModal: true })
    const submitButton = screen.getByRole('button', { name: /Complete Registration/i })
    expect(submitButton).toBeDisabled()
  })

  it('provides real-time National ID extraction feedback (DOB, Governorate, Gender, Age)', async () => {
    const user = userEvent.setup()
    renderPage({ isModal: true })

    const nationalIdInput = screen.getByLabelText(/Egyptian National ID/i)
    await user.type(nationalIdInput, '28505140101235')

    const parsedBadge = await screen.findByTestId('national-id-parsed-badge')
    expect(parsedBadge).toBeInTheDocument()
    expect(screen.getByText('1985-05-14')).toBeInTheDocument()
    expect(screen.getByText('Cairo')).toBeInTheDocument()
    expect(screen.getByText('Male')).toBeInTheDocument()
  })

  it('enforces cross-field blood pressure validation (systolic > diastolic)', async () => {
    const user = userEvent.setup()
    renderPage({ isModal: true })

    const systolicInput = screen.getByLabelText(/Systolic/i)
    const diastolicInput = screen.getByLabelText(/Diastolic/i)

    await user.type(systolicInput, '100')
    await user.type(diastolicInput, '110')

    const crossError = await screen.findByTestId('bp-cross-validation-error')
    expect(crossError).toBeInTheDocument()
    expect(crossError.textContent).toContain('strictly greater than')

    const submitButton = screen.getByRole('button', { name: /Complete Registration/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button and handles successful submission flow', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    vi.mocked(patientApi.createPatient).mockResolvedValueOnce(mockPatient)

    renderPage({ isModal: true, onSuccess })

    await user.type(screen.getByLabelText(/Egyptian National ID/i), '28505140101235')
    await user.type(screen.getByLabelText(/Full Name/i), 'Dr. Tarek Omar')
    await user.type(screen.getByLabelText(/Phone Number/i), '01012345678')
    await user.type(screen.getByLabelText(/Systolic/i), '125')
    await user.type(screen.getByLabelText(/Diastolic/i), '82')
    await user.type(screen.getByLabelText(/Glucose/i), '98.50')

    const submitButton = screen.getByRole('button', { name: /Complete Registration/i })
    expect(submitButton).not.toBeDisabled()

    await user.click(submitButton)

    await waitFor(() => {
      expect(patientApi.createPatient).toHaveBeenCalledTimes(1)
      expect(patientApi.createPatient).toHaveBeenCalledWith({
        national_id: '28505140101235',
        full_name: 'Dr. Tarek Omar',
        phone_number: '01012345678',
        baseline_systolic: 125,
        baseline_diastolic: 82,
        baseline_glucose: 98.5,
      })
      expect(onSuccess).toHaveBeenCalledWith(mockPatient)
    })
  })

  it('displays API error alert when creation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(patientApi.createPatient).mockRejectedValueOnce(
      new PatientApiError('A patient with this National ID already exists.', 409, {
        national_id: 'A patient with this National ID already exists.',
      })
    )

    renderPage({ isModal: true })

    await user.type(screen.getByLabelText(/Egyptian National ID/i), '28505140101235')
    await user.type(screen.getByLabelText(/Full Name/i), 'Dr. Tarek Omar')
    await user.type(screen.getByLabelText(/Phone Number/i), '01012345678')
    await user.type(screen.getByLabelText(/Systolic/i), '125')
    await user.type(screen.getByLabelText(/Diastolic/i), '82')

    const submitButton = screen.getByRole('button', { name: /Complete Registration/i })
    expect(submitButton).not.toBeDisabled()
    await user.click(submitButton)

    await waitFor(() => {
      expect(patientApi.createPatient).toHaveBeenCalled()
    })

    const alerts = await screen.findAllByText(
      /A patient with this National ID already exists/i
    )
    expect(alerts.length).toBeGreaterThanOrEqual(1)
  })
})
