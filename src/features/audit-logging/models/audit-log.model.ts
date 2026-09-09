// Entity mapping representation for the database schema

export const auditLogsSchemaSql = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

  -- Database-Level Immutability Enforcement
  CREATE OR REPLACE FUNCTION prevent_audit_tampering()
  RETURNS TRIGGER AS $$
  BEGIN
      RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted';
  END;
  $$ LANGUAGE plpgsql;

  -- Drop existing trigger if migrating
  DROP TRIGGER IF EXISTS trg_protect_audit_logs ON audit_logs;

  CREATE TRIGGER trg_protect_audit_logs
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
`;
