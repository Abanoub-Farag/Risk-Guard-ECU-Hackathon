import { hasPermission } from '../../src/features/auth/utils/role-matrix';

describe('RBAC Role Matrix Unit Tests', () => {
  it('CLINICIAN cannot authorize actions flagged for PHARMACIST', () => {
    // Clinician should not be able to execute dispensing
    expect(hasPermission('CLINICIAN', 'EXECUTE_DISPENSING')).toBe(false);
  });

  it('PATIENT cannot access any endpoint within the adjudications namespace', () => {
    // Patient should not be able to access the exception queue or submit adjudications
    expect(hasPermission('PATIENT', 'ACCESS_EXCEPTION_QUEUE')).toBe(false);
    expect(hasPermission('PATIENT', 'SUBMIT_ADJUDICATION')).toBe(false);
  });

  it('ADMIN can access audit logs but not clinical features', () => {
    expect(hasPermission('ADMIN', 'ACCESS_AUDIT_LOGS')).toBe(true);
    expect(hasPermission('ADMIN', 'SUBMIT_ADJUDICATION')).toBe(false);
  });
});
