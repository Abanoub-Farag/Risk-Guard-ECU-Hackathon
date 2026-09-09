import { AuditRecorderService } from '../../src/features/audit-logging/services/audit-recorder.service';
import { AuditLogRepository } from '../../src/features/audit-logging/repositories/audit-log.repository';
import { AuditLog } from '../../src/features/audit-logging/types/audit.types';

describe('AuditRecorderService Unit Tests', () => {
  let mockRepo: jest.Mocked<AuditLogRepository>;
  let service: AuditRecorderService;

  beforeEach(() => {
    mockRepo = {
      initializeSchema: jest.fn(),
      insertLog: jest.fn(),
      getLogs: jest.fn()
    } as any;
    service = new AuditRecorderService(mockRepo);
  });

  it('masks sensitive National IDs in the before and after state snapshots', async () => {
    const rawPayload = {
      patient_name: 'John Doe',
      national_id: '29901011234568',
      diagnosis: 'Hypertension'
    };

    const entry: Omit<AuditLog, 'id' | 'created_at'> = {
      actor_id: 'u1',
      actor_role: 'CLINICIAN',
      action: 'PATIENT_REGISTERED',
      entity_type: 'PATIENT',
      entity_id: 'p1',
      ip_address: '10.0.0.1',
      user_agent: 'Jest',
      before_state: null,
      after_state: rawPayload,
      metadata: null
    };

    await service.record(entry);

    expect(mockRepo.insertLog).toHaveBeenCalledTimes(1);
    const recordedLog = mockRepo.insertLog.mock.calls[0][0];
    
    // Original payload should not be mutated
    expect(rawPayload.national_id).toBe('29901011234568');
    
    // Recorded snapshot must be masked
    expect(recordedLog.after_state?.national_id).toBe('2990101******8');
    expect(recordedLog.after_state?.patient_name).toBe('John Doe');
  });

  it('redacts plain text passwords from snapshots', async () => {
    const rawPayload = {
      username: 'admin',
      password: 'supersecretpassword123'
    };

    await service.record({
      actor_id: 'u1',
      actor_role: 'SYSTEM_WORKER',
      action: 'PATIENT_REGISTERED',
      entity_type: 'PATIENT',
      entity_id: 'p1',
      ip_address: null,
      user_agent: null,
      before_state: rawPayload,
      after_state: null,
      metadata: null
    });

    const recordedLog = mockRepo.insertLog.mock.calls[0][0];
    expect(recordedLog.before_state?.password).toBe('***REDACTED***');
    expect(recordedLog.before_state?.username).toBe('admin');
  });
});
