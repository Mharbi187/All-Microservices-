-- ============================================================
-- V6 — Template Versioning
-- Each report is pinned to a specific published template version.
-- ============================================================

CREATE TABLE IF NOT EXISTS template_versions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID        NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number  INTEGER     NOT NULL,
    structure       JSONB       NOT NULL,
    change_summary  TEXT,
    created_by      UUID        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
    UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_tv_template_id
    ON template_versions(template_id);

CREATE INDEX IF NOT EXISTS idx_tv_published
    ON template_versions(template_id, is_published)
    WHERE is_published = TRUE;

-- Link report instances to the exact template version they were created from
ALTER TABLE report_instances
    ADD COLUMN IF NOT EXISTS template_version_id UUID
        REFERENCES template_versions(id) ON DELETE RESTRICT;
