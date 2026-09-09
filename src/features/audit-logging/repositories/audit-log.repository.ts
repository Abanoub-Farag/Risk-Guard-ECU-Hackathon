import { AuditLog, AuditQueryFilter } from '../types/audit.types';
import { auditLogsSchemaSql } from '../models/audit-log.model';

export interface DatabaseConnection {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
}

export class AuditLogRepository {
  constructor(private db: DatabaseConnection) {}

  async initializeSchema(): Promise<void> {
    await this.db.execute(auditLogsSchemaSql);
  }

  /**
   * Append-only insert operation. Must be used within a business transaction if possible.
   */
  async insertLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO audit_logs (
        actor_id, actor_role, action, entity_type, entity_id, 
        ip_address, user_agent, before_state, after_state, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await this.db.execute(sql, [
      log.actor_id, log.actor_role, log.action, log.entity_type, log.entity_id,
      log.ip_address, log.user_agent, 
      log.before_state ? JSON.stringify(log.before_state) : null, 
      log.after_state ? JSON.stringify(log.after_state) : null, 
      log.metadata ? JSON.stringify(log.metadata) : null
    ]);
  }

  async getLogs(filter: AuditQueryFilter): Promise<AuditLog[]> {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filter.entityId) {
      sql += ` AND entity_id = $${idx++}`;
      params.push(filter.entityId);
    }
    if (filter.actorRole) {
      sql += ` AND actor_role = $${idx++}`;
      params.push(filter.actorRole);
    }
    if (filter.action) {
      sql += ` AND action = $${idx++}`;
      params.push(filter.action);
    }
    if (filter.startDate) {
      sql += ` AND created_at >= $${idx++}`;
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      sql += ` AND created_at <= $${idx++}`;
      params.push(filter.endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT 1000`;
    return this.db.query<AuditLog>(sql, params);
  }
}
