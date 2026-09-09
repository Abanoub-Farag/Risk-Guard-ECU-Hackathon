import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog } from '../types/audit.types';

export class AuditRecorderService {
  constructor(private repository: AuditLogRepository) {}

  /**
   * Sanitizes sensitive fields before recording to the audit log.
   */
  private sanitizePayload(payload: Record<string, any> | null): Record<string, any> | null {
    if (!payload) return null;
    const sanitized = { ...payload };

    // Redact plain passwords
    if (sanitized.password) {
      sanitized.password = '***REDACTED***';
    }

    // Mask National IDs
    if (sanitized.national_id && typeof sanitized.national_id === 'string' && sanitized.national_id.length === 14) {
      const prefix = sanitized.national_id.substring(0, 7);
      const suffix = sanitized.national_id.substring(13);
      sanitized.national_id = `${prefix}******${suffix}`;
    }

    return sanitized;
  }

  /**
   * Records an audit log entry.
   */
  async record(entry: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const sanitizedEntry = {
      ...entry,
      before_state: this.sanitizePayload(entry.before_state),
      after_state: this.sanitizePayload(entry.after_state)
    };
    
    await this.repository.insertLog(sanitizedEntry);
  }
}
