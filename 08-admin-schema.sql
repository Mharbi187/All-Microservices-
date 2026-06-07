-- =============================================================================
-- NEXUS-AID — 08-admin-schema.sql
-- Initializes the schema for admin-service (nexusaid_admin)
-- =============================================================================
\c nexusaid_admin;

-- ─── DONATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donation_needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id UUID NOT NULL,
    committee_type VARCHAR(255) NOT NULL DEFAULT 'LOCAL',
    committee_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    target_amount DECIMAL(12,2),
    target_quantity INTEGER,
    current_amount DECIMAL(12,2) DEFAULT 0,
    current_quantity INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_by_role UUID, -- keep for compatibility
    creator_name VARCHAR(255),
    creator_role_name VARCHAR(255),
    validated_by UUID,
    validator_name VARCHAR(255),
    validated_at TIMESTAMPTZ,
    rejected_by UUID,
    rejector_name VARCHAR(255),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monetary_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL,
    donor_name VARCHAR(255),
    donor_cin VARCHAR(255),
    need_id UUID REFERENCES donation_needs(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'TND',
    payment_method VARCHAR(255),
    receipt_number VARCHAR(255) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    qr_code_data TEXT,
    received_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS in_kind_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL,
    donor_name VARCHAR(255),
    donor_cin VARCHAR(255),
    need_id UUID REFERENCES donation_needs(id),
    items_description JSONB NOT NULL,
    receipt_date DATE NOT NULL,
    receipt_number VARCHAR(255) UNIQUE NOT NULL,
    qr_code_data TEXT,
    received_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DYNAMIC REPORTS & TEMPLATES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    creator_role VARCHAR(100) NOT NULL,
    creator_committee_id UUID NOT NULL,
    visibility_scope VARCHAR(50) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL,
    position_order INTEGER NOT NULL,
    config JSONB NOT NULL,
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    label VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id),
    filled_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    workflow_status VARCHAR(30) DEFAULT 'DRAFT',
    report_level VARCHAR(30) NOT NULL,
    validated_by UUID,
    finalized_by UUID,
    submitted_at TIMESTAMPTZ,
    validated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_block_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES report_instances(id) ON DELETE CASCADE,
    block_id UUID REFERENCES template_blocks(id),
    content TEXT,
    file_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensitive_data_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES template_blocks(id),
    encrypted_content TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    key_version INTEGER DEFAULT 1,
    encrypted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (report_id, block_id)
);

CREATE TABLE IF NOT EXISTS monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id UUID,
    responsible_id UUID,
    report_period DATE NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(20),
    validated_by UUID,
    finalized_by UUID,
    validated_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EVENT LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_source VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    related_entity_id VARCHAR(36),
    related_entity_type VARCHAR(50),
    committee_id UUID
);

CREATE INDEX IF NOT EXISTS idx_event_logs_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_source ON event_logs(event_source);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
