import { buildVoucherIssuedMessage, formatVoucherCode } from '../../src/features/notifications/templates/voucher-issued.template';
import { buildClaimRejectedMessage } from '../../src/features/notifications/templates/claim-rejected.template';

describe('Notification Template Rendering Tests', () => {
  it('formats the 16-character voucher code cleanly', () => {
    const rawCode = 'abcd1234efgh5678';
    expect(formatVoucherCode(rawCode)).toBe('ABCD-1234-EFGH-5678');
  });

  it('inserts voucher code variables accurately into the approval template', () => {
    const result = buildVoucherIssuedMessage({ voucherCode: 'xyz98765mnb43210' });
    expect(result.title).toBe('Prescription Approved');
    expect(result.body).toContain('XYZ9-8765-MNB4-3210');
    expect(result.body).toContain('96 hours');
  });

  it('inserts rejection reasons empathetically', () => {
    const result = buildClaimRejectedMessage({ 
      rejectionReason: 'inadequate lighting in OCR scan',
      nextSteps: 'Please retake your device screen capture in clear lighting.'
    });
    
    expect(result.body).toContain('inadequate lighting in OCR scan');
    expect(result.body).toContain('Please retake your device screen capture in clear lighting.');
  });
});
