import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatientRegistrationForm from '../components/PatientRegistrationForm'
import { patientsApi, type Patient } from '../../../api/patients'

// Mock patientsApi
vi.mock('../../../api/patients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/patients')>()
  return {
    ...actual,
    patientsApi: {
      ...actual.patientsApi,
      createPatient: vi.fn(),
    },
  }
})

describe('PatientRegistrationForm Integration Test', () => {
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

  it('renders with submit button initially disabled', () => {
    render(<PatientRegistrationForm />)
    const submitButton = screen.getByRole('button', { name: /Complete Registration/i })
    expect(submitButton).toBeDisabled()
  })

  it('provides real-time National ID extraction feedback (DOB, Governorate, Gender, Age)', async () => {
    const user = userEvent.setup()
    render(<PatientRegistrationForm />)

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
    render(<PatientRegistrationForm />)

    const systolicInput = screen.getByLabelText(/Systolic/i)
    const diastolicInput = screen.getByLabelText(/Diastolic/i)

    // Enter systolic <= diastolic (e.g., 100 / 110)
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
    vi.mocked(patientsApi.createPatient).mockResolvedValueOnce(mockPatient)

    render(<PatientRegistrationForm onSuccess={onSuccess} />)

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
      expect(patientsApi.createPatient).toHaveBeenCalledTimes(1)
      expect(patientsApi.createPatient).toHaveBeenCalledWith({
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

  it('displays API conflict (409) or validation errors gracefully', async () => {
    const user = userEvent.setup()
    vi.mocked(patientsApi.createPatient).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: 'A patient with this National ID already exists.',
          errors: {
            national_id: ['A patient with this National ID already exists.'],
          },
        },
      },
    })

    render(<PatientRegistrationForm />)

    await user.type(screen.getByLabelText(/Egyptian National ID/i), '28505140101235')
    await user.type(screen.getByLabelText(/Full Name/i), 'Dr. Tarek Omar')
    await user.type(screen.getByLabelText(/Phone Number/i), '01012345678')
    await user.type(screen.getByLabelText(/Systolic/i), '125')
    await user.type(screen.getByLabelText(/Diastolic/i), '82')

    const submitButton = screen.getByRole('button', { name: /Complete Registration/i })
    await user.click(submitButton)

    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toContain('A patient with this National ID already exists.')
  })
})
