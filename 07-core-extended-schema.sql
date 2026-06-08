-- =============================================================================
-- NEXUS-AID — 07-core-extended-schema.sql
-- Adds missing tables for core-service (nexusaiddb)
-- =============================================================================
\c nexusaiddb;

-- ─── COMPLAINTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitter_id UUID REFERENCES users(id),
    target_committee_id UUID NOT NULL REFERENCES committees(id),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
    status VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1024) NOT NULL,
    public_id VARCHAR(255),
    file_type VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NEWS & EVENTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    author_id UUID NOT NULL REFERENCES users(id),
    committee_id UUID REFERENCES committees(id),
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_likes (
    news_id UUID NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    PRIMARY KEY (news_id, volunteer_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    organizer_id UUID NOT NULL REFERENCES users(id),
    committee_id UUID REFERENCES committees(id),
    max_participants INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, volunteer_id)
);

-- ─── INTERVENTIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id UUID NOT NULL REFERENCES committees(id),
    intervention_type VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_gps TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP,
    responsible_id UUID REFERENCES volunteers(id),
    status VARCHAR(255) NOT NULL DEFAULT 'PLANNED',
    participants_count INTEGER DEFAULT 0,
    beneficiaries_count INTEGER DEFAULT 0,
    materials_used TEXT,
    report_content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intervention_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id),
    role VARCHAR(255) NOT NULL,
    hours_contributed DECIMAL DEFAULT 0,
    attended BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(intervention_id, volunteer_id)
);

-- ─── INVENTORY & STOCK ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER NOT NULL DEFAULT 0,
    committee_id UUID NOT NULL REFERENCES committees(id)
);

CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by UUID
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quantity INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    recorded_by UUID
);

-- ─── REPORTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id UUID,
    responsible_id UUID,
    report_period DATE NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    validated_by UUID,
    finalized_by UUID,
    validated_at TIMESTAMP,
    finalized_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── OTHER TABLES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainers (
    id UUID PRIMARY KEY REFERENCES volunteers(id) ON DELETE CASCADE,
    expertise_domains JSONB,
    audit_history JSONB
);

CREATE TABLE IF NOT EXISTS hierarchy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    performed_by UUID NOT NULL,
    target_committee_id UUID,
    target_volunteer_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    reason TEXT
);

-- ─── YOUTH SYSTEM ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS youth_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    target_level VARCHAR(50),
    committee_id VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS youth_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_form_template UUID NOT NULL REFERENCES youth_form_templates(id) ON DELETE CASCADE,
    id_volunteer UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS youth_integration_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    aspirations JSONB,
    skills JSONB,
    aptitudes JSONB,
    interest_areas JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS micro_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    theme VARCHAR(255) NOT NULL,
    description TEXT,
    lead_volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
    participants JSONB,
    status VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    results JSONB
);

CREATE TABLE IF NOT EXISTS youth_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID,
    committee_id UUID REFERENCES committees(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(255),
    target VARCHAR(255),
    priority VARCHAR(255),
    status VARCHAR(255),
    date_creation TIMESTAMPTZ,
    recommended_training_ia JSONB,
    recommended_missions JSONB,
    confidence_score DOUBLE PRECISION,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS youth_domain_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_type VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    color VARCHAR(50)
);
