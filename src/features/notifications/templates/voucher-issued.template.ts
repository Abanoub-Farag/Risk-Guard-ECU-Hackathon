export function formatVoucherCode(code: string): string {
  // Ensure the 16 character code is formatted nicely: XXXX-XXXX-XXXX-XXXX
  return code.toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1);
}

export function buildVoucherIssuedMessage(variables: Record<string, string>): { title: string; body: string } {
  const formattedCode = formatVoucherCode(variables.voucherCode || '');
  
  return {
    title: 'Prescription Approved',
    body: `Your refill request has been approved. Your voucher code is ${formattedCode}. It expires in 96 hours. Show this to your pharmacist to dispense your medication.`
  };
}
