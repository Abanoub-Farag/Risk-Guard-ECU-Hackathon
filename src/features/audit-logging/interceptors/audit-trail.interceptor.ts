import { AuditRecorderService } from '../services/audit-recorder.service';
import { AuditAction, ActorRole, EntityType } from '../types/audit.types';

/**
 * Mock Request/Response/Next interfaces for framework-agnostic middleware
 */
export interface HttpRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; role: ActorRole };
  body: any;
  method: string;
  url: string;
}
export interface HttpResponse {
  statusCode: number;
}
export type NextFunction = () => Promise<void>;

/**
 * Interceptor mapping rules
 */
const AUDIT_RULES: Array<{
  method: string;
  pathRegex: RegExp;
  action: AuditAction;
  entityType: EntityType;
}> = [
  { method: 'POST', pathRegex: /^\/api\/v1\/vouchers\/redeem$/, action: 'VOUCHER_DISPENSED', entityType: 'VOUCHER' },
  { method: 'POST', pathRegex: /^\/api\/v1\/adjudication$/, action: 'MANUAL_ADJUDICATION_SUBMITTED', entityType: 'REFILL_REQUEST' }
];

export function createAuditInterceptor(auditService: AuditRecorderService) {
  return async (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
    // 1. Identify if this route needs auditing
    const rule = AUDIT_RULES.find(r => req.method === r.method && r.pathRegex.test(req.url));
    
    if (!rule) {
      return next();
    }

    // Capture before state (simplified for middleware; normally you'd query the DB here)
    const beforeState = null; 

    // Extract IP securely (e.g. from X-Forwarded-For)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : req.ip || null;

    try {
      // 2. Execute business logic
      await next();

      // 3. Record success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await auditService.record({
          actor_id: req.user?.id || null,
          actor_role: req.user?.role || 'SYSTEM_WORKER',
          action: rule.action,
          entity_type: rule.entityType,
          entity_id: req.body?.id || req.body?.voucher_code || 'UNKNOWN',
          ip_address: ipAddress,
          user_agent: req.headers['user-agent'] as string || null,
          before_state: beforeState,
          after_state: req.body, // The payload that caused the change
          metadata: null
        });
      }
    } catch (error) {
      // If the operation rolled back/failed, we might log a failure or let the DB transaction rollback
      throw error;
    }
  };
}
