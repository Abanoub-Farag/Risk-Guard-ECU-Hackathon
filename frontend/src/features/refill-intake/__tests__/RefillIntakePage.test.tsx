import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RefillIntakePage } from '../pages/RefillIntakePage'
import { refillApi, RefillApiError } from '../services/refill.api'
import type { DeviceScan, RefillRequest } from '../types/refill.types'

// Mock useData
vi.mock('../../../hooks/useData', () => ({
  useData: () => ({
    loading: false,
    overview: {
      total_patients: 1,
      total_vouchers: 0,
      active_vouchers: 0,
      patients: [
        {
          patient_id: 'patient-uuid-1',
          full_name: 'Mahmoud Salem',
          national_id: '29001010101234',
          phone_number: '01012345678',
          baseline_systolic: 120,
          baseline_diastolic: 80,
          baseline_glucose: null,
          active_prescriptions: [
            {
              id: 'prescription-uuid-1',
              medication_name: 'Metformin 500mg',
              dosage: '1 tablet twice daily',
              last_dispensed_at: null, // First cycle: allowed
            },
            {
              id: 'prescription-uuid-blocked',
              medication_name: 'Lisinopril 10mg',
              dosage: '1 tablet daily',
              last_dispensed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago: blocked
            },
          ],
          cycles: [],
        },
      ],
    },
  }),
}))

// Mock refillApi
vi.mock('../services/refill.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/refill.api')>()
  return {
    ...actual,
    refillApi: {
      createRefillRequest: vi.fn(),
      uploadDeviceScan: vi.fn(),
      submitRefillForReview: vi.fn(),
      getRefillRequest: vi.fn(),
    },
  }
})

describe('RefillIntakePage Integration Test', () => {
  const mockRefillRequest: RefillRequest = {
    id: 'refill-uuid-1',
    patient_id: 'patient-uuid-1',
    prescription_id: 'prescription-uuid-1',
    status: 'NEEDS_REVIEW',
    missed_doses_past_week: 1,
    has_severe_symptoms: false,
    submitted_at: '2026-09-09T18:00:00Z',
    created_at: '2026-09-09T18:00:00Z',
    updated_at: '2026-09-09T18:05:00Z',
    scans: [],
  }

  const mockScan: DeviceScan = {
    id: 'scan-uuid-1',
    refill_request_id: 'refill-uuid-1',
    device_type: 'BLOOD_PRESSURE',
    image_storage_uri: 'sovereign://egypt-sovereign-health-records/eg-north-1/scans/scan.jpg',
    captured_at: '2026-09-09T18:02:00Z',
    created_at: '2026-09-09T18:02:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL and URL.revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:3000/mock-uuid')
    window.URL.revokeObjectURL = vi.fn()
  })

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <RefillIntakePage />
      </MemoryRouter>
    )
  }

  it('renders with submit button initially disabled when no image is staged', () => {
    renderPage()
    const submitBtn = screen.getByRole('button', {
      name: /Submit Refill for Triage Review/i,
    })
    expect(submitBtn).toBeDisabled()
  })

  it('triggers early refill warning banner and locks submit button when prescription is within 25 days', async () => {
    const user = userEvent.setup()
    renderPage()

    // Select patient
    const patientSelect = screen.getByLabelText(/Patient Selection/i)
    await user.selectOptions(patientSelect, 'patient-uuid-1')

    // Select blocked prescription (dispensed 5 days ago)
    const rxSelect = screen.getByLabelText(/Active Prescription/i)
    await user.selectOptions(rxSelect, 'prescription-uuid-blocked')

    // Warning banner must be present
    const warningBanner = await screen.findByRole('alert')
    expect(warningBanner).toBeInTheDocument()
    expect(screen.getByText(/Early Refill Guardrail Active/i)).toBeInTheDocument()
    expect(screen.getByText(/20 days remaining/i)).toBeInTheDocument()

    // Submit button must remain disabled
    const submitBtn = screen.getByRole('button', {
      name: /Submit Refill for Triage Review/i,
    })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submission when valid image is staged and prescription is eligible', async () => {
    const user = userEvent.setup()
    renderPage()

    // Select patient
    await user.selectOptions(screen.getByLabelText(/Patient Selection/i), 'patient-uuid-1')

    // Select eligible prescription (never dispensed before)
    await user.selectOptions(
      screen.getByLabelText(/Active Prescription/i),
      'prescription-uuid-1'
    )

    // Stage valid JPEG image
    const validBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const file = new File([validBytes], 'bp_screen.jpg', { type: 'image/jpeg' })

    const fileInput = screen.getByLabelText(/Upload medical device screen capture/i)
    await user.upload(fileInput, file)

    // Image preview card should appear
    await waitFor(() => {
      expect(screen.getByText('bp_screen.jpg')).toBeInTheDocument()
      expect(screen.getByText(/Magic bytes verified/i)).toBeInTheDocument()
    })

    // Submit button should now be enabled
    const submitBtn = screen.getByRole('button', {
      name: /Submit Refill for Triage Review/i,
    })
    expect(submitBtn).not.toBeDisabled()
  })

  it('handles sequential submission flow (create -> upload scan -> submit for review)', async () => {
    const user = userEvent.setup()

    vi.mocked(refillApi.createRefillRequest).mockResolvedValueOnce(mockRefillRequest)
    vi.mocked(refillApi.uploadDeviceScan).mockResolvedValueOnce(mockScan)
    vi.mocked(refillApi.submitRefillForReview).mockResolvedValueOnce({
      ...mockRefillRequest,
      status: 'NEEDS_REVIEW',
    })

    renderPage()

    await user.selectOptions(screen.getByLabelText(/Patient Selection/i), 'patient-uuid-1')
    await user.selectOptions(
      screen.getByLabelText(/Active Prescription/i),
      'prescription-uuid-1'
    )

    const validBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    const file = new File([validBytes], 'scan.jpg', { type: 'image/jpeg' })
    await user.upload(
      screen.getByLabelText(/Upload medical device screen capture/i),
      file
    )

    await waitFor(() => {
      expect(screen.getByText('scan.jpg')).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', {
      name: /Submit Refill for Triage Review/i,
    })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(refillApi.createRefillRequest).toHaveBeenCalledTimes(1)
      expect(refillApi.createRefillRequest).toHaveBeenCalledWith({
        patient_id: 'patient-uuid-1',
        prescription_id: 'prescription-uuid-1',
        missed_doses_past_week: 0,
        has_severe_symptoms: false,
      })
      expect(refillApi.uploadDeviceScan).toHaveBeenCalledTimes(1)
      expect(refillApi.uploadDeviceScan).toHaveBeenCalledWith(
        'refill-uuid-1',
        'BLOOD_PRESSURE',
        expect.any(File)
      )
      expect(refillApi.submitRefillForReview).toHaveBeenCalledTimes(1)
      expect(refillApi.submitRefillForReview).toHaveBeenCalledWith('refill-uuid-1')
    })
  })

  it('displays API error alert gracefully when backend request fails', async () => {
    const user = userEvent.setup()

    vi.mocked(refillApi.createRefillRequest).mockRejectedValueOnce(
      new RefillApiError('An active refill request is already pending for prescription.', 409)
    )

    renderPage()

    await user.selectOptions(screen.getByLabelText(/Patient Selection/i), 'patient-uuid-1')
    await user.selectOptions(
      screen.getByLabelText(/Active Prescription/i),
      'prescription-uuid-1'
    )

    const validBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    const file = new File([validBytes], 'scan.jpg', { type: 'image/jpeg' })
    await user.upload(
      screen.getByLabelText(/Upload medical device screen capture/i),
      file
    )

    await waitFor(() => {
      expect(screen.getByText('scan.jpg')).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', {
      name: /Submit Refill for Triage Review/i,
    })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/An active refill request is already pending for prescription/i)
      ).toBeInTheDocument()
    })
  })
})
