-- ============================================================
-- V7 — Archive Immutability & Full Audit Trail
-- ============================================================

-- Content hash + PDF storage key for immutable archive
ALTER TABLE report_instances
    ADD COLUMN IF NOT EXISTS content_hash    VARCHAR(64),
    ADD COLUMN IF NOT EXISTS pdf_storage_key VARCHAR(512);

-- Full audit log for every workflow transition
CREATE TABLE IF NOT EXISTS report_audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID        NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    action          VARCHAR(64) NOT NULL,   -- CREATED | SUBMITTED | VALIDATED | FINALIZED | ARCHIVED
    performed_by    UUID        NOT NULL,
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    details         JSONB                   -- snapshot of changed fields
);

CREATE INDEX IF NOT EXISTS idx_ral_report_id
    ON report_audit_log(report_id);

CREATE INDEX IF NOT EXISTS idx_ral_performed_at
    ON report_audit_log(performed_at DESC);
