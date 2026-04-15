-- FHIR Observation table
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL DEFAULT 'Observation',
    status TEXT NOT NULL DEFAULT 'final',
    code_system TEXT NOT NULL,
    code_value TEXT NOT NULL,
    code_display TEXT NOT NULL,
    value_quantity NUMERIC,
    value_unit TEXT,
    subject_reference TEXT,
    effective_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_fhir JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log table (HIPAA-friendly)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    client_ip TEXT,
    user_agent TEXT,
    status_code INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_effective ON observations(effective_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_obs_code ON observations(code_value);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
