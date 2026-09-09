import { QueueItem, ClaimDetailResponse, SubmitAdjudicationDTO } from '../types/adjudication.types';

const API_BASE_URL = '/api/v1';

export async function fetchQueueItems(): Promise<QueueItem[]> {
  const response = await fetch(`${API_BASE_URL}/adjudication/queue`);
  if (!response.ok) throw new Error('Failed to fetch queue');
  return response.json();
}

export async function fetchClaimDetail(claimId: string): Promise<ClaimDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/adjudication/claims/${claimId}`);
  if (!response.ok) throw new Error('Failed to fetch claim details');
  return response.json();
}

export async function submitAdjudication(claimId: string, payload: SubmitAdjudicationDTO): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/adjudication/claims/${claimId}/adjudicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('This claim has already been adjudicated by another staff member.');
    }
    const data = await response.json();
    throw new Error(data.detail || 'Failed to submit adjudication');
  }
}
