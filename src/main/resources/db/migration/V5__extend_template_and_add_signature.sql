-- ============================================================
-- V5 — Extend templates & report_instances; create signatures
-- ============================================================

-- ── Templates: new columns ───────────────────────────────────
ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS structure         JSONB,
    ADD COLUMN IF NOT EXISTS parent_template_id UUID
        REFERENCES templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_base_template  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS scope             VARCHAR(20),
    ADD COLUMN IF NOT EXISTS assignment_rules  JSONB;

CREATE INDEX IF NOT EXISTS idx_templates_parent
    ON templates(parent_template_id);

CREATE INDEX IF NOT EXISTS idx_templates_scope
    ON templates(scope);

-- ── Report instances: new columns ────────────────────────────
ALTER TABLE report_instances
    ADD COLUMN IF NOT EXISTS filled_data       JSONB,
    ADD COLUMN IF NOT EXISTS archived_by       UUID,
    ADD COLUMN IF NOT EXISTS finalized_at      TIMESTAMPTZ;

-- ── Signatures table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signatures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID        NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL,
    image_url       VARCHAR(512),
    image_hash      VARCHAR(64) NOT NULL,
    binding_hash    VARCHAR(64) NOT NULL,
    signer_role     VARCHAR(100),
    signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified        BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_signatures_report
    ON signatures(report_id);

CREATE INDEX IF NOT EXISTS idx_signatures_user
    ON signatures(user_id);
