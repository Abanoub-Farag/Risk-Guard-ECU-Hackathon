export function buildClaimRejectedMessage(variables: Record<string, string>): { title: string; body: string } {
  const reason = variables.rejectionReason || 'clinical reasons';
  const nextSteps = variables.nextSteps || 'Consult your nearest clinic for assistance.';
  
  return {
    title: 'Claim Update: Action Required',
    body: `We are unable to approve your refill request at this time due to: ${reason}. Next steps: ${nextSteps}`
  };
}
