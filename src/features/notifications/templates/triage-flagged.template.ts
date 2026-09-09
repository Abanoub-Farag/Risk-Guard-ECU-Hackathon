export function buildTriageFlaggedMessage(variables: Record<string, string>): { title: string; body: string } {
  return {
    title: 'Claim Under Medical Review',
    body: `Hello ${variables.patientName || ''}, your prescription refill claim is currently under review by our medical staff to ensure your safety. We will notify you within standard SLA times once the review is complete.`
  };
}
