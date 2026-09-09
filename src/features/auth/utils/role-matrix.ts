import { UserRole } from '../types/auth.types';

export type AppFeature = 
  | 'SUBMIT_REFILL_INTAKE'
  | 'VIEW_OWN_VOUCHER'
  | 'ACCESS_EXCEPTION_QUEUE'
  | 'VIEW_CLAIM_TELEMETRY'
  | 'SUBMIT_ADJUDICATION'
  | 'ACCESS_POS_TERMINAL'
  | 'PREFLIGHT_VOUCHER_LOOKUP'
  | 'EXECUTE_DISPENSING'
  | 'ACCESS_AUDIT_LOGS'
  | 'USER_MANAGEMENT';

const rolePermissions: Record<UserRole, AppFeature[]> = {
  PATIENT: [
    'SUBMIT_REFILL_INTAKE',
    'VIEW_OWN_VOUCHER'
  ],
  CLINICIAN: [
    'ACCESS_EXCEPTION_QUEUE',
    'VIEW_CLAIM_TELEMETRY',
    'SUBMIT_ADJUDICATION'
  ],
  PHARMACIST: [
    'ACCESS_POS_TERMINAL',
    'PREFLIGHT_VOUCHER_LOOKUP',
    'EXECUTE_DISPENSING'
  ],
  ADMIN: [
    'ACCESS_AUDIT_LOGS',
    'USER_MANAGEMENT'
  ]
};

export function hasPermission(role: UserRole, feature: AppFeature): boolean {
  return rolePermissions[role]?.includes(feature) ?? false;
}
