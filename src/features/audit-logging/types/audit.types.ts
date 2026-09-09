export type AuditAction = 
  | 'PATIENT_REGISTERED'
  | 'TRIAGE_EVALUATED'
  | 'MANUAL_ADJUDICATION_SUBMITTED'
  | 'VOUCHER_ISSUED'
  | 'VOUCHER_DISPENSED'
  | 'VOUCHER_EXPIRED'
  | 'EARLY_REFILL_OVERRIDE';

export type ActorRole = 'CLINICIAN' | 'PHARMACIST' | 'PATIENT' | 'SYSTEM_WORKER';
export type EntityType = 'PATIENT' | 'REFILL_REQUEST' | 'VOUCHER';

export interface AuditLog {
  id: string; // UUID
  actor_id: string | null; // UUID or null for system
  actor_role: ActorRole;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string; // UUID
  ip_address: string | null;
  user_agent: string | null;
  before_state: Record<string, any> | null;
  after_state: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface AuditQueryFilter {
  entityId?: string;
  actorRole?: ActorRole;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}
