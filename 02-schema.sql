-- =============================================================================
-- NEXUS-AID — Complete Standalone Schema v3.0
\c nexusaid_db;
-- PostgreSQL | Single executable file | Production-ready
-- Password for all accounts: pass
-- BCrypt: $2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO
-- =============================================================================
-- NOTE: nexusaid_db is used by core-service (users, volunteers, committees)
-- nexusaid_admin is used by admin-service (donations, reports)

SET client_min_messages TO WARNING;

-- =============================================================================
-- SECTION 1 — DROP TABLES (reverse FK order)
-- =============================================================================

DROP TABLE IF EXISTS audit_log              CASCADE;
DROP TABLE IF EXISTS donation_receipts      CASCADE;
DROP TABLE IF EXISTS donations              CASCADE;
DROP TABLE IF EXISTS donation_needs         CASCADE;
DROP TABLE IF EXISTS donors                CASCADE;
DROP TABLE IF EXISTS training_records      CASCADE;
DROP TABLE IF EXISTS certifications        CASCADE;
DROP TABLE IF EXISTS volunteer_skills      CASCADE;
DROP TABLE IF EXISTS skills                CASCADE;
DROP TABLE IF EXISTS skill_categories      CASCADE;
DROP TABLE IF EXISTS role_permissions      CASCADE;
DROP TABLE IF EXISTS permissions           CASCADE;
DROP TABLE IF EXISTS committee_roles       CASCADE;
DROP TABLE IF EXISTS role_definitions      CASCADE;
DROP TABLE IF EXISTS approval_requests     CASCADE;
DROP TABLE IF EXISTS volunteers            CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;
DROP TABLE IF EXISTS committees            CASCADE;

-- =============================================================================
-- SECTION 2 — CREATE TABLES
-- =============================================================================

CREATE TABLE committees (
    id                    UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    name                  VARCHAR(200) NOT NULL,
    type                  VARCHAR(20)  NOT NULL CHECK (type IN ('NATIONAL','REGIONAL','LOCAL')),
    region                VARCHAR(100) NOT NULL,
    status                VARCHAR(30)  NOT NULL DEFAULT 'PENDING_CONSTITUTION'
                          CHECK (status IN ('ACTIVE','PENDING_CONSTITUTION','SUSPENDED','DISSOLVED')),
    parent_committee_id   UUID         REFERENCES committees(id) ON DELETE RESTRICT,
    current_mandate_start DATE,
    current_mandate_end   DATE,
    approved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_committees_mandate CHECK (
        current_mandate_end IS NULL OR current_mandate_end > current_mandate_start
    ),
    CONSTRAINT uk_committee_type_region UNIQUE (type, region)
);

CREATE TABLE users (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    cin             VARCHAR(20)  UNIQUE NOT NULL,
    phone           VARCHAR(20),
    birth_date      DATE,
    avatar_url      TEXT,
    user_type       VARCHAR(20)  NOT NULL DEFAULT 'VOLUNTEER'
                    CHECK (user_type IN ('VOLUNTEER','DONOR','ADMIN')),
    account_status  VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                    CHECK (account_status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
    approved_by     UUID         REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE volunteers (
    id                UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    matricule         VARCHAR(50) UNIQUE,
    committee_id      UUID        REFERENCES committees(id) ON DELETE SET NULL,
    date_adhesion     DATE,
    hours_volunteered DECIMAL(10,2) DEFAULT 0,
    motivation_text   TEXT,
    emergency_contact VARCHAR(150),
    emergency_phone   VARCHAR(20),
    skills            JSONB,
    training_progress JSONB
);

CREATE TABLE donors (
    id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    organization_name   VARCHAR(200),
    donor_type          VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL'
                        CHECK (donor_type IN ('INDIVIDUAL','CORPORATE','NGO')),
    is_anonymous        BOOLEAN DEFAULT FALSE,
    total_donated_amount DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE donation_needs (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    committee_id    UUID         NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    type            VARCHAR(255) NOT NULL,
    priority        VARCHAR(255) NOT NULL,
    description     TEXT         NOT NULL,
    quantity_needed VARCHAR(255),
    beneficiaries   INTEGER,
    status          VARCHAR(255) NOT NULL,
    published_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE donations (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    donation_number VARCHAR(100) UNIQUE,
    donor_id        UUID         NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    need_id         UUID         REFERENCES donation_needs(id) ON DELETE SET NULL,
    donation_type   VARCHAR(100) NOT NULL,
    description     TEXT,
    quantity        VARCHAR(255),
    note            TEXT,
    photo_url       TEXT,
    status          VARCHAR(100) NOT NULL DEFAULT 'CONFIRMED',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    -- Old columns for SQL compatibility:
    committee_id    UUID         REFERENCES committees(id) ON DELETE SET NULL,
    amount          DECIMAL(12,2),
    currency        VARCHAR(5)   DEFAULT 'TND',
    donated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE donation_receipts (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_number  VARCHAR(255) UNIQUE NOT NULL,
    donation_id     UUID         NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    validated_at    TIMESTAMPTZ,
    validated_by_id UUID         REFERENCES users(id) ON DELETE SET NULL,
    validation_note TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE skill_categories (
    id      UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    code    VARCHAR(50)  UNIQUE NOT NULL,
    label   VARCHAR(100) NOT NULL,
    color   VARCHAR(10)
);

CREATE TABLE skills (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    code        VARCHAR(80)  UNIQUE NOT NULL,
    label       VARCHAR(150) NOT NULL,
    category_id UUID         NOT NULL REFERENCES skill_categories(id),
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE volunteer_skills (
    volunteer_id  UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    skill_id      UUID NOT NULL REFERENCES skills(id),
    level         VARCHAR(20) DEFAULT 'BEGINNER'
                  CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT')),
    acquired_at   DATE,
    verified_by   UUID REFERENCES users(id),
    PRIMARY KEY (volunteer_id, skill_id)
);

CREATE TABLE certifications (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    volunteer_id    UUID         NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    skill_id        UUID         REFERENCES skills(id),
    title           VARCHAR(200) NOT NULL,
    issuing_body    VARCHAR(200) NOT NULL,
    certificate_no  VARCHAR(100),
    issue_date      DATE         NOT NULL,
    expiry_date     DATE,
    document_url    TEXT,
    cert_status     VARCHAR(20)  DEFAULT 'VERIFIED'
                    CHECK (cert_status IN ('SELF_DECLARED','PENDING_REVIEW','VERIFIED','REJECTED')),
    reviewed_by     UUID  REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT chk_cert_dates CHECK (expiry_date IS NULL OR expiry_date > issue_date)
);

CREATE TABLE training_records (
    id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    volunteer_id    UUID         NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    skill_id        UUID         NOT NULL REFERENCES skills(id),
    title           VARCHAR(200) NOT NULL,
    facilitator     VARCHAR(150),
    status          VARCHAR(20)  NOT NULL DEFAULT 'NOT_STARTED'
                    CHECK (status IN ('NOT_STARTED','REGISTERED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
    scheduled_date  DATE,
    completed_at    TIMESTAMPTZ,
    score           DECIMAL(5,2),
    notes           TEXT,
    validated_by    UUID  REFERENCES users(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (volunteer_id, skill_id, title)
);

CREATE TABLE role_definitions (
    id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    code              VARCHAR(80)  UNIQUE NOT NULL,
    label             VARCHAR(150) NOT NULL,
    applicable_scope  VARCHAR(20)  NOT NULL DEFAULT 'ALL'
                      CHECK (applicable_scope IN ('NATIONAL','REGIONAL','LOCAL','ALL')),
    is_mandatory      BOOLEAN      DEFAULT FALSE,
    is_unique         BOOLEAN      DEFAULT TRUE,
    mandate_years     INT          DEFAULT 4,
    description       TEXT,
    is_active         BOOLEAN      DEFAULT TRUE,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE permissions (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    code        VARCHAR(100) UNIQUE NOT NULL,
    module      VARCHAR(60)  NOT NULL,
    action      VARCHAR(30)  NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_def_id   UUID NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id)      ON DELETE CASCADE,
    data_scope    VARCHAR(20) DEFAULT 'CHILDREN'
                  CHECK (data_scope IN ('OWN','CHILDREN','ALL')),
    PRIMARY KEY (role_def_id, permission_id)
);

CREATE TABLE committee_roles (
    id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    role_def_id      UUID         REFERENCES role_definitions(id),
    title            VARCHAR(100) NOT NULL,
    committee_id     UUID         NOT NULL REFERENCES committees(id),
    volunteer_id     UUID         NOT NULL REFERENCES volunteers(id),
    status           VARCHAR(20)  NOT NULL DEFAULT 'APPROVED'
                     CHECK (status IN ('PROPOSED','APPROVED','REJECTED','REVOKED','EXPIRED')),
    proposed_by      UUID         REFERENCES users(id),
    proposed_at      TIMESTAMPTZ  DEFAULT NOW(),
    approved_by      UUID         REFERENCES users(id),
    approved_at      TIMESTAMPTZ,
    reason           TEXT,
    rejection_reason TEXT,
    assigned_at      TIMESTAMPTZ  DEFAULT NOW(),
    mandate_end_date DATE,
    created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE approval_requests (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    volunteer_id    UUID        NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    committee_id    UUID        NOT NULL REFERENCES committees(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    assigned_to     UUID        REFERENCES users(id),
    reviewed_by     UUID        REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT,
    motivation      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id             BIGSERIAL    PRIMARY KEY,
    entity_table   VARCHAR(100) NOT NULL,
    entity_id      UUID         NOT NULL,
    action_type    VARCHAR(30)  NOT NULL
                   CHECK (action_type IN ('INSERT','UPDATE','DELETE','APPROVE','REJECT','ASSIGN','REVOKE','LOGIN')),
    actor_id       UUID         REFERENCES users(id),
    actor_email    VARCHAR(255),
    committee_ctx  UUID         REFERENCES committees(id),
    old_values     JSONB,
    new_values     JSONB,
    changed_fields TEXT[],
    reason         TEXT         NOT NULL,
    ip_address     INET,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SECTION 3 — INDEXES
-- =============================================================================

CREATE INDEX idx_committees_parent      ON committees(parent_committee_id);
CREATE INDEX idx_committees_type_status ON committees(type, status);

CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_users_status           ON users(account_status);
CREATE INDEX idx_users_pending          ON users(created_at DESC) WHERE account_status = 'PENDING';

CREATE INDEX idx_volunteers_committee   ON volunteers(committee_id);

CREATE INDEX idx_committee_roles_vol    ON committee_roles(volunteer_id);
CREATE INDEX idx_committee_roles_com    ON committee_roles(committee_id);
CREATE INDEX idx_committee_roles_active ON committee_roles(volunteer_id, committee_id, role_def_id)
    WHERE status = 'APPROVED';

CREATE UNIQUE INDEX uk_one_active_role  ON committee_roles(committee_id, role_def_id)
    WHERE status = 'APPROVED';

CREATE INDEX idx_vol_skills_vol         ON volunteer_skills(volunteer_id);
CREATE INDEX idx_vol_skills_skill       ON volunteer_skills(skill_id);

CREATE INDEX idx_training_volunteer     ON training_records(volunteer_id);
CREATE INDEX idx_training_status        ON training_records(status);

CREATE INDEX idx_cert_volunteer         ON certifications(volunteer_id);
CREATE INDEX idx_cert_expiry            ON certifications(expiry_date)
    WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_approval_pending       ON approval_requests(committee_id, status)
    WHERE status = 'PENDING';

CREATE INDEX idx_audit_entity           ON audit_log(entity_table, entity_id);
CREATE INDEX idx_audit_actor            ON audit_log(actor_id);
CREATE INDEX idx_audit_time             ON audit_log(created_at DESC);
CREATE INDEX idx_audit_committee        ON audit_log(committee_ctx);

-- =============================================================================
-- SECTION 4 — INSERT DATA
-- =============================================================================

-- ─── 4.1 COMMITTEES ────────────────────────────────────────────────────────
INSERT INTO committees (id, name, type, region, parent_committee_id, status, approved_at, current_mandate_start, current_mandate_end, created_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'Siège National CRT',              'NATIONAL', 'Tunis',         NULL,                                   'ACTIVE',               '2010-02-01', '2024-01-15', '2028-01-15', '2010-01-01'),
('b0000000-0000-0000-0000-000000000001', 'Comité Régional de Tunis',        'REGIONAL', 'Tunis',         'a0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2012-04-01', '2025-01-10', '2029-01-10', '2012-03-01'),
('b0000000-0000-0000-0000-000000000002', 'Comité Régional de Sousse',       'REGIONAL', 'Sousse',        'a0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2013-07-01', '2025-03-01', '2029-03-01', '2013-06-01'),
('b0000000-0000-0000-0000-000000000003', 'Comité Régional de Sfax',         'REGIONAL', 'Sfax',          'a0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2014-02-01', '2025-05-01', '2029-05-01', '2014-01-01'),
('b0000000-0000-0000-0000-000000000004', 'Comité Régional de Bizerte',      'REGIONAL', 'Bizerte',       'a0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2015-10-01', '2024-10-01', '2028-10-01', '2015-09-01'),
('b0000000-0000-0000-0000-000000000005', 'Comité Régional de Gabès',        'REGIONAL', 'Gabès',         'a0000000-0000-0000-0000-000000000001', 'SUSPENDED',            '2016-02-01', '2022-02-01', '2026-02-01', '2016-01-01'),
('b0000000-0000-0000-0000-000000000006', 'Comité Régional de Nabeul',       'REGIONAL', 'Nabeul',        'a0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2017-06-01', '2025-06-01', '2029-06-01', '2017-05-01'),
('b0000000-0000-0000-0000-000000000007', 'Comité Régional de Kairouan',     'REGIONAL', 'Kairouan',      'a0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2018-10-01', '2025-09-01', '2029-09-01', '2018-09-01'),
('b0000000-0000-0000-0000-000000000008', 'Comité Régional de Monastir',     'REGIONAL', 'Monastir',      'a0000000-0000-0000-0000-000000000001', 'PENDING_CONSTITUTION',  NULL,          NULL,         NULL,         '2025-11-01'),
('c0000000-0000-0000-0000-000000000001', 'Comité Local de Bardo',           'LOCAL',    'Bardo',         'b0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2018-06-01', '2023-06-01', '2027-06-01', '2018-05-01'),
('c0000000-0000-0000-0000-000000000002', 'Comité Local d''Ariana',          'LOCAL',    'Ariana',        'b0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2019-02-01', '2023-02-01', '2027-02-01', '2019-01-01'),
('c0000000-0000-0000-0000-000000000003', 'Comité Local de La Marsa',        'LOCAL',    'La Marsa',      'b0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2020-04-01', '2024-04-01', '2028-04-01', '2020-03-01'),
('c0000000-0000-0000-0000-000000000004', 'Comité Local de Ben Arous',       'LOCAL',    'Ben Arous',     'b0000000-0000-0000-0000-000000000001', 'ACTIVE',               '2020-07-01', '2024-07-01', '2028-07-01', '2020-06-01'),
('c0000000-0000-0000-0000-000000000005', 'Comité Local de Hammam Sousse',   'LOCAL',    'Hammam Sousse', 'b0000000-0000-0000-0000-000000000002', 'ACTIVE',               '2019-06-01', '2023-06-01', '2027-06-01', '2019-05-01'),
('c0000000-0000-0000-0000-000000000006', 'Comité Local de Msaken',          'LOCAL',    'Msaken',        'b0000000-0000-0000-0000-000000000002', 'ACTIVE',               '2021-02-01', '2025-02-01', '2029-02-01', '2021-01-01'),
('c0000000-0000-0000-0000-000000000007', 'Comité Local de Sakiet Ezzit',    'LOCAL',    'Sakiet Ezzit',  'b0000000-0000-0000-0000-000000000003', 'ACTIVE',               '2020-10-01', '2024-10-01', '2028-10-01', '2020-09-01'),
('c0000000-0000-0000-0000-000000000008', 'Comité Local de Thyna',           'LOCAL',    'Thyna',         'b0000000-0000-0000-0000-000000000003', 'PENDING_CONSTITUTION',  NULL,          NULL,         NULL,         '2026-01-01'),
('c0000000-0000-0000-0000-000000000009', 'Comité Local de Menzel Bourguiba','LOCAL',    'Menzel Bourguiba','b0000000-0000-0000-0000-000000000004','ACTIVE',              '2021-04-01', '2025-04-01', '2029-04-01', '2021-03-01');

-- ─── 4.2 USERS — Admins ────────────────────────────────────────────────────
INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status) VALUES
('00000000-0000-0000-0000-000000000001', 'superadmin@crt.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'WebMaster Support', '00000001', '+21671000001', 'ADMIN', 'APPROVED'),
('00000000-0000-0000-0000-000000000002', 'admin.si@crt.tn',     '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Responsable SI',    '00000002', '+21671000002', 'ADMIN', 'APPROVED');

-- ─── 4.3 USERS — National Bureau ───────────────────────────────────────────
INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date) VALUES
('10000000-0000-0000-0000-000000000001', 'president.national@crt.tn',     '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Ahmed Ben Salah',    '09876543', '+21671320001', 'VOLUNTEER', 'APPROVED', '1968-05-12'),
('10000000-0000-0000-0000-000000000002', 'vp.national@crt.tn',            '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Fatma Khelifi',      '09876544', '+21671320002', 'VOLUNTEER', 'APPROVED', '1972-09-25'),
('10000000-0000-0000-0000-000000000003', 'sg.national@crt.tn',            '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Karim Trabelsi',     '09876545', '+21671320003', 'VOLUNTEER', 'APPROVED', '1975-03-07'),
('10000000-0000-0000-0000-000000000004', 'resp.secourisme.nat@crt.tn',    '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Sami Bouaziz',       '09876546', '+21698111001', 'VOLUNTEER', 'APPROVED', '1980-11-18'),
('10000000-0000-0000-0000-000000000005', 'resp.sante.nat@crt.tn',         '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Dr. Ines Mansouri',  '09876547', '+21622111002', 'VOLUNTEER', 'APPROVED', '1978-07-30'),
('10000000-0000-0000-0000-000000000006', 'resp.jeunesse.nat@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Mohamed Larbi',      '09876548', '+21655111003', 'VOLUNTEER', 'APPROVED', '1985-02-14'),
('10000000-0000-0000-0000-000000000007', 'resp.diffusion.nat@crt.tn',     '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Anis Gharbi',        '09876549', '+21650111004', 'VOLUNTEER', 'APPROVED', '1983-06-21'),
('10000000-0000-0000-0000-000000000008', 'resp.social.nat@crt.tn',        '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Leila Zaki',         '09876550', '+21625111005', 'VOLUNTEER', 'APPROVED', '1979-08-03'),
('10000000-0000-0000-0000-000000000009', 'resp.vff.nat@crt.tn',           '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Rima Saafi',         '09876551', '+21629111006', 'VOLUNTEER', 'APPROVED', '1982-12-05'),
('10000000-0000-0000-0000-000000000010', 'resp.immigration.nat@crt.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Omar Cherni',        '09876552', '+21654111007', 'VOLUNTEER', 'APPROVED', '1977-04-17'),
('10000000-0000-0000-0000-000000000011', 'resp.catastrophe.nat@crt.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Hichem Jebali',      '09876553', '+21652111008', 'VOLUNTEER', 'APPROVED', '1973-10-29');

-- ─── 4.4 USERS — Regional & Local ──────────────────────────────────────────
INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date) VALUES
('20000000-0000-0000-0000-000000000001', 'president.tunis@crt.tn',       '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Walid Hamdi',         '08500001', '+21671501001', 'VOLUNTEER', 'APPROVED', '1975-04-15'),
('20000000-0000-0000-0000-000000000002', 'sg.tunis@crt.tn',              '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Salma Ben Amor',      '08500002', '+21671501002', 'VOLUNTEER', 'APPROVED', '1980-09-22'),
('20000000-0000-0000-0000-000000000003', 'resp.sante.tunis@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Dr. Mehdi Tlili',     '08500003', '+21622501003', 'VOLUNTEER', 'APPROVED', '1978-01-08'),
('20000000-0000-0000-0000-000000000004', 'resp.secours.tunis@crt.tn',    '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Fadhel Gaddour',      '08500004', '+21698501004', 'VOLUNTEER', 'APPROVED', '1982-07-19'),
('20000000-0000-0000-0000-000000000005', 'resp.jeunesse.tunis@crt.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Sana Riahi',          '08500005', '+21655501005', 'VOLUNTEER', 'APPROVED', '1990-03-30'),
('20000000-0000-0000-0000-000000000006', 'resp.social.tunis@crt.tn',     '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Hajer Boulares',      '08500006', '+21629501006', 'VOLUNTEER', 'APPROVED', '1985-11-14'),
('20000000-0000-0000-0000-000000000007', 'resp.vff.tunis@crt.tn',        '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Amira Baccar',        '08500007', '+21654501007', 'VOLUNTEER', 'APPROVED', '1983-06-02'),
('20000000-0000-0000-0000-000000000010', 'president.sousse@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Nabil Ferchichi',     '08600001', '+21673601001', 'VOLUNTEER', 'APPROVED', '1972-08-11'),
('20000000-0000-0000-0000-000000000011', 'sg.sousse@crt.tn',             '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Yomna Chabaane',      '08600002', '+21673601002', 'VOLUNTEER', 'APPROVED', '1979-02-27'),
('20000000-0000-0000-0000-000000000012', 'resp.secours.sousse@crt.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Imed Chekir',         '08600003', '+21698601003', 'VOLUNTEER', 'APPROVED', '1985-05-15'),
('20000000-0000-0000-0000-000000000013', 'resp.immigration.sousse@crt.tn','$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Chiraz Selmi',        '08600004', '+21652601004', 'VOLUNTEER', 'APPROVED', '1988-09-09'),
('20000000-0000-0000-0000-000000000020', 'president.sfax@crt.tn',        '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Bassem Dridi',        '08700001', '+21674701001', 'VOLUNTEER', 'APPROVED', '1970-12-03'),
('20000000-0000-0000-0000-000000000021', 'sg.sfax@crt.tn',               '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Olfa Abid',           '08700002', '+21674701002', 'VOLUNTEER', 'APPROVED', '1977-07-16'),
('20000000-0000-0000-0000-000000000022', 'resp.sante.sfax@crt.tn',       '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Dr. Asma Hamdouni',   '08700003', '+21625701003', 'VOLUNTEER', 'APPROVED', '1981-04-22'),
('20000000-0000-0000-0000-000000000030', 'president.bizerte@crt.tn',     '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Sofien Baraket',      '08800001', '+21672801001', 'VOLUNTEER', 'APPROVED', '1974-03-28'),
('20000000-0000-0000-0000-000000000031', 'sg.bizerte@crt.tn',            '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Intissar Ayari',      '08800002', '+21672801002', 'VOLUNTEER', 'APPROVED', '1980-10-05'),
('20000000-0000-0000-0000-000000000040', 'president.nabeul@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Tarek Ben Youssef',   '08900001', '+21672901001', 'VOLUNTEER', 'APPROVED', '1976-06-14'),
('20000000-0000-0000-0000-000000000041', 'sg.nabeul@crt.tn',             '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Najwa Khalfoun',      '08900002', '+21672901002', 'VOLUNTEER', 'APPROVED', '1983-01-31'),
('20000000-0000-0000-0000-000000000050', 'president.kairouan@crt.tn',    '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Abdelaziz Snoussi',   '09000001', '+21677001001', 'VOLUNTEER', 'APPROVED', '1968-11-25'),
('30000000-0000-0000-0000-000000000001', 'president.bardo@crt.tn',       '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Mohsen Barhoumi',     '07100001', '+21671100001', 'VOLUNTEER', 'APPROVED', '1981-03-10'),
('30000000-0000-0000-0000-000000000002', 'sg.bardo@crt.tn',              '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Aymen Mahjoubi',      '07100002', '+21671100002', 'VOLUNTEER', 'APPROVED', '1987-07-20'),
('30000000-0000-0000-0000-000000000003', 'president.ariana@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Noura Hamrouni',      '07200001', '+21671200001', 'VOLUNTEER', 'APPROVED', '1984-11-05'),
('30000000-0000-0000-0000-000000000004', 'sg.ariana@crt.tn',             '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Fares Jlassi',        '07200002', '+21671200002', 'VOLUNTEER', 'APPROVED', '1990-04-18');

-- ─── 4.5 USERS — Classic Volunteers (PENDING/REJECTED edge cases) ───────────
INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status, birth_date) VALUES
('40000000-0000-0000-0000-000000000001', 'secouriste1@crt.tn',    '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Ali Sghaier',         '05100001', '+21698201001', 'VOLUNTEER', 'APPROVED', '1992-04-10'),
('40000000-0000-0000-0000-000000000002', 'medecin1@crt.tn',       '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Dr. Manel Hadj Tahar','05100002', '+21622202002', 'VOLUNTEER', 'APPROVED', '1988-11-23'),
('40000000-0000-0000-0000-000000000003', 'logisticien1@crt.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Mehdi Chebbi',        '05100003', '+21699203003', 'VOLUNTEER', 'APPROVED', '1990-07-15'),
('40000000-0000-0000-0000-000000000004', 'it1@crt.tn',            '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Hamza Agrebi',        '05100004', '+21625204004', 'VOLUNTEER', 'APPROVED', '1995-02-28'),
('40000000-0000-0000-0000-000000000005', 'communic1@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Yasmine Fersi',       '05100005', '+21650205005', 'VOLUNTEER', 'APPROVED', '1993-09-03'),
('40000000-0000-0000-0000-000000000070', 'PENDING1@crt.tn',       '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Yassine Ben Salem',   '05200001', '+21698300001', 'VOLUNTEER', 'PENDING',  '1998-06-15'),
('40000000-0000-0000-0000-000000000071', 'PENDING2@crt.tn',       '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Olfa Rezgui',         '05200002', '+21655300002', 'VOLUNTEER', 'PENDING',  '2000-01-20'),
('40000000-0000-0000-0000-000000000080', 'rejected1@crt.tn',      '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Nihel Farhat',        '05300001', '+21698400001', 'VOLUNTEER', 'REJECTED', '1996-03-10'),
('40000000-0000-0000-0000-000000000090', 'suspended1@crt.tn',     '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Hatem Krichen',       '05400001', '+21698500001', 'VOLUNTEER', 'SUSPENDED','1985-08-22');

-- ─── 4.6 USERS — Donors ────────────────────────────────────────────────────
INSERT INTO users (id, email, password, full_name, cin, phone, user_type, account_status) VALUES
('50000000-0000-0000-0000-000000000001', 'donateur1@gmail.com',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Groupe Poulina SA',   '06100001', '+21671600001', 'DONOR', 'APPROVED'),
('50000000-0000-0000-0000-000000000002', 'donateur2@banque.tn',   '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Banque Zitouna',      '06100002', '+21671600002', 'DONOR', 'APPROVED'),
('50000000-0000-0000-0000-000000000003', 'donateur3@yahoo.fr',    '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO', 'Hamid Ben Fredj',     '06100003', '+21698600003', 'DONOR', 'APPROVED');

-- ─── 4.7 VOLUNTEERS table (extension) ──────────────────────────────────────
INSERT INTO volunteers (id, matricule, committee_id, date_adhesion, hours_volunteered, motivation_text) VALUES
('10000000-0000-0000-0000-000000000001', '66T-NAT-P001',  'a0000000-0000-0000-0000-000000000001', '2010-03-15', 3500.0, 'Servir la nation à travers le Croissant Rouge Tunisien'),
('10000000-0000-0000-0000-000000000002', '66T-NAT-V001',  'a0000000-0000-0000-0000-000000000001', '2012-06-20', 2800.0, 'Contribuer au développement de l''action humanitaire'),
('10000000-0000-0000-0000-000000000003', '66T-NAT-SG01',  'a0000000-0000-0000-0000-000000000001', '2013-01-01', 2400.0, 'Assurer la bonne gouvernance de l''organisation'),
('10000000-0000-0000-0000-000000000004', '66T-NAT-S001',  'a0000000-0000-0000-0000-000000000001', '2015-08-01', 2200.0, 'Sauver des vies grâce au secourisme professionnel'),
('10000000-0000-0000-0000-000000000005', '66T-NAT-M001',  'a0000000-0000-0000-0000-000000000001', '2014-02-15', 1900.0, 'Améliorer la santé publique des populations vulnérables'),
('10000000-0000-0000-0000-000000000006', '66T-NAT-J001',  'a0000000-0000-0000-0000-000000000001', '2016-09-01', 1600.0, 'Investir dans la jeunesse tunisienne'),
('10000000-0000-0000-0000-000000000007', '66T-NAT-D001',  'a0000000-0000-0000-0000-000000000001', '2017-03-10', 1400.0, 'Diffuser les valeurs humanitaires'),
('10000000-0000-0000-0000-000000000008', '66T-NAT-AS01',  'a0000000-0000-0000-0000-000000000001', '2015-11-20', 2100.0, 'Soutenir les familles vulnérables'),
('10000000-0000-0000-0000-000000000009', '66T-NAT-VF01',  'a0000000-0000-0000-0000-000000000001', '2016-04-05', 1750.0, 'Protéger les victimes de violence'),
('10000000-0000-0000-0000-000000000010', '66T-NAT-IM01',  'a0000000-0000-0000-0000-000000000001', '2017-07-12', 1500.0, 'Aider les migrants et réfugiés'),
('10000000-0000-0000-0000-000000000011', '66T-NAT-C001',  'a0000000-0000-0000-0000-000000000001', '2014-11-01', 2000.0, 'Coordonner la réponse aux catastrophes'),
('20000000-0000-0000-0000-000000000001', '66T-TUN-P001',  'b0000000-0000-0000-0000-000000000001', '2013-04-15', 2100.0, 'Développer le CRT au niveau de Tunis'),
('20000000-0000-0000-0000-000000000002', '66T-TUN-SG01',  'b0000000-0000-0000-0000-000000000001', '2015-01-10', 1700.0, 'Gérer l''administration du comité régional'),
('20000000-0000-0000-0000-000000000003', '66T-TUN-M001',  'b0000000-0000-0000-0000-000000000001', '2016-03-22', 1400.0, 'Assurer les soins de santé primaires'),
('20000000-0000-0000-0000-000000000004', '66T-TUN-S001',  'b0000000-0000-0000-0000-000000000001', '2017-05-01', 1600.0, 'Former et déployer les équipes de secours'),
('20000000-0000-0000-0000-000000000005', '66T-TUN-J001',  'b0000000-0000-0000-0000-000000000001', '2018-09-01', 900.0,  'Animer les activités jeunesse de la région'),
('20000000-0000-0000-0000-000000000006', '66T-TUN-AS01',  'b0000000-0000-0000-0000-000000000001', '2016-11-20', 1200.0, 'Accompagner les familles en difficulté'),
('20000000-0000-0000-0000-000000000007', '66T-TUN-VF01',  'b0000000-0000-0000-0000-000000000001', '2017-04-05', 1100.0, 'Protéger les femmes victimes de violence'),
('20000000-0000-0000-0000-000000000010', '66T-SOU-P001',  'b0000000-0000-0000-0000-000000000002', '2014-08-11', 1900.0, 'Diriger le comité régional de Sousse'),
('20000000-0000-0000-0000-000000000011', '66T-SOU-SG01',  'b0000000-0000-0000-0000-000000000002', '2016-02-27', 1300.0, 'Coordonner les activités de Sousse'),
('20000000-0000-0000-0000-000000000012', '66T-SOU-S001',  'b0000000-0000-0000-0000-000000000002', '2017-05-15', 1500.0, 'Secourisme maritime et côtier'),
('20000000-0000-0000-0000-000000000013', '66T-SOU-IM01',  'b0000000-0000-0000-0000-000000000002', '2018-09-09', 800.0,  'Aide aux migrants côtiers'),
('20000000-0000-0000-0000-000000000020', '66T-SFX-P001',  'b0000000-0000-0000-0000-000000000003', '2012-12-03', 2300.0, 'Leader CRT Sfax'),
('20000000-0000-0000-0000-000000000021', '66T-SFX-SG01',  'b0000000-0000-0000-0000-000000000003', '2014-07-16', 1600.0, 'Administration régionale Sfax'),
('20000000-0000-0000-0000-000000000022', '66T-SFX-M001',  'b0000000-0000-0000-0000-000000000003', '2016-04-22', 1200.0, 'Médecine générale et urgences'),
('20000000-0000-0000-0000-000000000030', '66T-BIZ-P001',  'b0000000-0000-0000-0000-000000000004', '2013-03-28', 2000.0, 'Développement CRT Bizerte'),
('20000000-0000-0000-0000-000000000031', '66T-BIZ-SG01',  'b0000000-0000-0000-0000-000000000004', '2015-10-05', 1400.0, 'Gestion administrative Bizerte'),
('20000000-0000-0000-0000-000000000040', '66T-NAB-P001',  'b0000000-0000-0000-0000-000000000006', '2017-06-14', 1200.0, '66T Nabeul'),
('20000000-0000-0000-0000-000000000041', '66T-NAB-SG01',  'b0000000-0000-0000-0000-000000000006', '2018-01-31', 800.0,  'Secrétariat Nabeul'),
('20000000-0000-0000-0000-000000000050', '66T-KAI-P001',  'b0000000-0000-0000-0000-000000000007', '2014-11-25', 2100.0, '66T Kairouan'),
('30000000-0000-0000-0000-000000000001', '66T-BAR-P001',  'c0000000-0000-0000-0000-000000000001', '2015-03-10', 950.0,  'Bardo local committee'),
('30000000-0000-0000-0000-000000000002', '66T-BAR-SG01',  'c0000000-0000-0000-0000-000000000001', '2016-07-20', 600.0,  'Secrétariat local Bardo'),
('30000000-0000-0000-0000-000000000003', '66T-ARI-P001',  'c0000000-0000-0000-0000-000000000002', '2016-11-05', 850.0,  'Comité local Ariana'),
('30000000-0000-0000-0000-000000000004', '66T-ARI-SG01',  'c0000000-0000-0000-0000-000000000002', '2018-04-18', 500.0,  'Secrétariat Ariana'),
('40000000-0000-0000-0000-000000000001', '66T-VOL-0001',  'c0000000-0000-0000-0000-000000000001', '2019-09-01', 340.0,  'Volontaire secouriste confirmé'),
('40000000-0000-0000-0000-000000000002', '66T-VOL-0002',  'b0000000-0000-0000-0000-000000000001', '2020-01-15', 210.0,  'Médecin bénévole urgences'),
('40000000-0000-0000-0000-000000000003', '66T-VOL-0003',  'b0000000-0000-0000-0000-000000000002', '2021-03-10', 180.0,  'Gestion des stocks et logistique'),
('40000000-0000-0000-0000-000000000004', '66T-VOL-0004',  'c0000000-0000-0000-0000-000000000003', '2022-06-01', 90.0,   'Développement des systèmes informatiques'),
('40000000-0000-0000-0000-000000000005', '66T-VOL-0005',  'c0000000-0000-0000-0000-000000000004', '2023-01-20', 120.0,  'Communication et relations publiques'),
('40000000-0000-0000-0000-000000000070', '66T-VOL-PEND1', 'c0000000-0000-0000-0000-000000000001', '2026-03-01', 0.0,    'Motivé à rejoindre le CRT comme secouriste'),
('40000000-0000-0000-0000-000000000071', '66T-VOL-PEND2', 'b0000000-0000-0000-0000-000000000002', '2026-04-01', 0.0,    'Médecin souhaitant contribuer aux actions de santé'),
('40000000-0000-0000-0000-000000000080', '66T-VOL-REJ1',  'c0000000-0000-0000-0000-000000000002', '2025-01-01', 0.0,    NULL),
('40000000-0000-0000-0000-000000000090', '66T-VOL-SUS1',  'b0000000-0000-0000-0000-000000000001', '2018-06-01', 300.0,  NULL);

-- ─── 4.8 DONORS table ──────────────────────────────────────────────────────
INSERT INTO donors (id, organization_name, donor_type, is_anonymous, total_donated_amount) VALUES
('50000000-0000-0000-0000-000000000001', 'Groupe Poulina SA', 'CORPORATE',   FALSE, 85000.00),
('50000000-0000-0000-0000-000000000002', 'Banque Zitouna',    'CORPORATE',   FALSE, 42000.00),
('50000000-0000-0000-0000-000000000003', NULL,                'INDIVIDUAL',  FALSE, 3500.00);

-- ─── 4.9 DONATIONS ─────────────────────────────────────────────────────────
INSERT INTO donations (id, donor_id, committee_id, amount, donation_type, description, donated_at) VALUES
('d1000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 50000.00, 'MONETARY',  'Don annuel Poulina — budget humanitaire 2025',       '2025-01-15'),
('d1000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 35000.00, 'MONETARY',  'Don Poulina — Caravane Santé Tunis',                  '2026-02-01'),
('d1000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 42000.00, 'MONETARY',  'Banque Zitouna — Campagne Ramadan 2026',               '2026-03-15'),
('d1000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 2000.00,  'MONETARY',  'Don individuel — Journée Secourisme Bardo',           '2026-03-22'),
('d1000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 1500.00,  'IN_KIND',   'Matériel médical pour Sousse',                        '2026-04-01');

-- ─── 4.10 SKILL CATEGORIES & SKILLS ────────────────────────────────────────
INSERT INTO skill_categories (id, code, label, color) VALUES
('c0000001-0000-0000-0000-000000000001', 'SECOURISME',  'Secourisme',         '#E74C3C'),
('c0000001-0000-0000-0000-000000000002', 'MEDICAL',     'Médical',            '#3498DB'),
('c0000001-0000-0000-0000-000000000003', 'SOCIAL',      'Action Sociale',     '#2ECC71'),
('c0000001-0000-0000-0000-000000000004', 'LOGISTIQUE',  'Logistique',         '#F39C12'),
('c0000001-0000-0000-0000-000000000005', 'TECH',        'Informatique',       '#9B59B6'),
('c0000001-0000-0000-0000-000000000006', 'COMM',        'Communication',      '#1ABC9C'),
('c0000001-0000-0000-0000-000000000007', 'JEUNESSE',    'Animation Jeunesse', '#E67E22'),
('c0000001-0000-0000-0000-000000000008', 'ADMIN',       'Administration',     '#95A5A6');

INSERT INTO skills (id, code, label, category_id) VALUES
('d0000001-0000-0000-0000-000000000001', 'PSE1',           'Premiers Secours en Équipe N1',      'c0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000002', 'PSE2',           'Premiers Secours en Équipe N2',      'c0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000003', 'RCP',            'Réanimation Cardio-Pulmonaire',       'c0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000004', 'DAE',            'Défibrillateur Automatisé Externe',   'c0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000005', 'TRIAGE',         'TRIAGE médical de masse',             'c0000001-0000-0000-0000-000000000001'),
('d0000001-0000-0000-0000-000000000006', 'PHTLS',          'Pre-Hospital Trauma Life Support',    'c0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000007', 'SANTE_PUB',      'Santé Publique',                      'c0000001-0000-0000-0000-000000000002'),
('d0000001-0000-0000-0000-000000000008', 'TRAVAIL_SOCIAL', 'TRAVAIL Social',                      'c0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000009', 'ECOUTE_ACTIVE',  'Écoute Active',                       'c0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000010', 'LOGISTIQUE',     'Gestion Logistique & Stocks',         'c0000001-0000-0000-0000-000000000004'),
('d0000001-0000-0000-0000-000000000011', 'GESTION_CRISE',  'Gestion de Crise',                    'c0000001-0000-0000-0000-000000000004'),
('d0000001-0000-0000-0000-000000000012', 'DEV_WEB',        'Développement Web',                   'c0000001-0000-0000-0000-000000000005'),
('d0000001-0000-0000-0000-000000000013', 'RESEAUX',        'Administration Réseaux',              'c0000001-0000-0000-0000-000000000005'),
('d0000001-0000-0000-0000-000000000014', 'COMM_DIGITALE',  'Communication Digitale',              'c0000001-0000-0000-0000-000000000006'),
('d0000001-0000-0000-0000-000000000015', 'ANIMATION',      'Animation & Formation Jeunesse',      'c0000001-0000-0000-0000-000000000007'),
('d0000001-0000-0000-0000-000000000016', 'LEADERSHIP',     'Leadership & Management',             'c0000001-0000-0000-0000-000000000008'),
('d0000001-0000-0000-0000-000000000017', 'IMMIGRATION_AID','Aide aux Migrants',                   'c0000001-0000-0000-0000-000000000003'),
('d0000001-0000-0000-0000-000000000018', 'VFF_SUPPORT',    'Soutien Victimes Violence',           'c0000001-0000-0000-0000-000000000003');

-- ─── 4.11 VOLUNTEER_SKILLS ──────────────────────────────────────────────────
INSERT INTO volunteer_skills (volunteer_id, skill_id, level, acquired_at) VALUES
('10000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000016', 'EXPERT',       '2010-01-01'),
('10000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000011', 'EXPERT',       '2012-01-01'),
('10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000001', 'EXPERT',       '2015-01-01'),
('10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000002', 'EXPERT',       '2016-06-01'),
('10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003', 'EXPERT',       '2015-03-01'),
('10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000004', 'EXPERT',       '2015-03-01'),
('10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000005', 'ADVANCED',     '2017-09-01'),
('10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000006', 'ADVANCED',     '2018-06-01'),
('10000000-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000007', 'EXPERT',       '2014-01-01'),
('10000000-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000006', 'ADVANCED',     '2016-01-01'),
('10000000-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000015', 'EXPERT',       '2016-01-01'),
('10000000-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000014', 'ADVANCED',     '2017-01-01'),
('10000000-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000008', 'EXPERT',       '2015-01-01'),
('10000000-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000009', 'EXPERT',       '2015-01-01'),
('10000000-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000018', 'EXPERT',       '2016-01-01'),
('10000000-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000009', 'EXPERT',       '2016-01-01'),
('10000000-0000-0000-0000-000000000010', 'd0000001-0000-0000-0000-000000000017', 'EXPERT',       '2017-01-01'),
('10000000-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000011', 'EXPERT',       '2014-01-01'),
('10000000-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000010', 'EXPERT',       '2014-01-01'),
('40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'ADVANCED',     '2019-10-01'),
('40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002', 'INTERMEDIATE', '2020-06-01'),
('40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003', 'ADVANCED',     '2019-10-01'),
('40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000004', 'ADVANCED',     '2019-10-01'),
('40000000-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000007', 'EXPERT',       '2020-02-01'),
('40000000-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000006', 'ADVANCED',     '2021-01-01'),
('40000000-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000010', 'ADVANCED',     '2021-06-01'),
('40000000-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000011', 'INTERMEDIATE', '2022-01-01'),
('40000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000012', 'EXPERT',       '2022-09-01'),
('40000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000013', 'INTERMEDIATE', '2023-01-01'),
('40000000-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000014', 'ADVANCED',     '2023-03-01'),
('40000000-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000015', 'INTERMEDIATE', '2023-06-01');

-- ─── 4.12 CERTIFICATIONS ───────────────────────────────────────────────────
INSERT INTO certifications (id, volunteer_id, skill_id, title, issuing_body, certificate_no, issue_date, expiry_date, cert_status) VALUES
('ce000001-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000002', 'PSE2 — Niveau Confirmé', '66T National', 'PSE2-2022-NAT-001', '2022-06-15', '2026-06-15', 'VERIFIED'),
('ce000001-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000006', 'PHTLS Provider',         'NAEMT International', 'PHTLS-2023-001', '2023-04-01', '2027-04-01', 'VERIFIED'),
('ce000001-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000007', 'Diplôme Médecine Urgence','Faculté Médecine Tunis', 'MED-URG-2010-001', '2010-06-01', NULL, 'VERIFIED'),
('ce000001-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'PSE1',                   '66T Local Bardo', 'PSE1-2020-BAR-001', '2020-05-10', '2024-05-10', 'VERIFIED'),
('ce000001-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000003', 'RCP Adulte-Enfant',       '66T Tunis', 'RCP-2021-TUN-001',  '2021-09-15', '2025-09-15', 'VERIFIED'),
('ce000001-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000007', 'Diplôme Médecine Générale','Faculté Médecine Sfax', 'MED-GEN-2014-001', '2014-07-01', NULL, 'VERIFIED');

-- ─── 4.13 TRAINING RECORDS ─────────────────────────────────────────────────
INSERT INTO training_records (id, volunteer_id, skill_id, title, facilitator, status, scheduled_date, completed_at, score) VALUES
('f0000001-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002', 'Formation PSE2 — Promotion 2024', 'Sami Bouaziz', 'COMPLETED', '2024-06-01', '2024-06-15 17:00:00', 87.50),
('f0000001-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000005', 'TRIAGE MRRU 2025',               'Fadhel Gaddour','IN_PROGRESS','2025-03-01', NULL, NULL),
('f0000001-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000010', 'Gestion stocks humanitaires',    'Hichem Jebali', 'COMPLETED', '2023-10-01', '2023-10-05 16:00:00', 92.00),
('f0000001-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000012', 'Dev Web Spring Boot',            'Hamza Agrebi',  'COMPLETED', '2022-09-01', '2022-12-15 17:00:00', 78.00),
('f0000001-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000070', 'd0000001-0000-0000-0000-000000000001', 'Formation PSE1 — Bardo 2026',    'Ali Sghaier',   'REGISTERED', '2026-05-01', NULL, NULL),
('f0000001-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000006', 'Formation PHTLS 2023',           'Dr. Ines Mansouri','FAILED','2023-11-01', '2023-11-30 17:00:00', 42.00);

-- ─── 4.14 ROLE DEFINITIONS (ALL roles available at ALL levels) ─────────────
INSERT INTO role_definitions (id, code, label, applicable_scope, is_mandatory, is_unique, mandate_years, description) VALUES
('c1000001-0000-0000-0000-000000000001', 'PRESIDENT',           'Président(e)',               'ALL', TRUE,  TRUE, 4, 'Dirige le bureau du comité. Mandat de 4 ans.'),
('c1000001-0000-0000-0000-000000000002', 'VICE_PRESIDENT',      'Vice-Président(e)',          'ALL', FALSE, TRUE, 4, 'Seconde le président et le remplace si besoin.'),
('c1000001-0000-0000-0000-000000000003', 'SECRETAIRE_GENERAL',  'Secrétaire Général(e)',      'ALL', TRUE,  TRUE, 4, 'Gestion administrative et coordination.'),
('c1000001-0000-0000-0000-000000000004', 'RESP_SECOURISME',     'Responsable Secourisme',     'ALL', FALSE, TRUE, 4, 'Pilotage des équipes et formations de secours.'),
('c1000001-0000-0000-0000-000000000005', 'RESP_SANTE',          'Responsable Santé',          'ALL', FALSE, TRUE, 4, 'Actions médicales et santé publique.'),
('c1000001-0000-0000-0000-000000000006', 'RESP_JEUNESSE',       'Responsable Jeunesse',       'ALL', FALSE, TRUE, 4, 'Programmes et activités pour les jeunes.'),
('c1000001-0000-0000-0000-000000000007', 'RESP_DIFFUSION',      'Responsable Diffusion',      'ALL', FALSE, TRUE, 4, 'Communication, sensibilisation et DIH.'),
('c1000001-0000-0000-0000-000000000008', 'RESP_ACTION_SOCIALE', 'Responsable Action Sociale', 'ALL', FALSE, TRUE, 4, 'Aide aux familles vulnérables et cas sociaux.'),
('c1000001-0000-0000-0000-000000000009', 'RESP_VFF',            'Responsable VFF',            'ALL', FALSE, TRUE, 4, 'Soutien aux victimes de violence faite aux femmes.'),
('c1000001-0000-0000-0000-000000000010', 'RESP_IMMIGRATION',    'Responsable Immigration',    'ALL', FALSE, TRUE, 4, 'Assistance aux migrants et réfugiés.'),
('c1000001-0000-0000-0000-000000000011', 'RESP_CATASTROPHES',   'Responsable Catastrophes',   'ALL', FALSE, TRUE, 4, 'Coordination des interventions d''urgence et catastrophes.');

-- ─── 4.15 PERMISSIONS ──────────────────────────────────────────────────────
INSERT INTO permissions (id, code, module, action) VALUES
('c2000001-0000-0000-0000-000000000001', 'volunteers:read',    'VOLUNTEERS',  'READ'),
('c2000001-0000-0000-0000-000000000002', 'volunteers:create',  'VOLUNTEERS',  '66EATE'),
('c2000001-0000-0000-0000-000000000003', 'volunteers:approve', 'VOLUNTEERS',  'APPROVE'),
('c2000001-0000-0000-0000-000000000004', 'volunteers:reject',  'VOLUNTEERS',  'REJECT'),
('c2000001-0000-0000-0000-000000000005', 'committees:read',    'COMMITTEES',  'READ'),
('c2000001-0000-0000-0000-000000000006', 'committees:manage',  'COMMITTEES',  'UPDATE'),
('c2000001-0000-0000-0000-000000000007', 'roles:assign',       'ROLES',       '66EATE'),
('c2000001-0000-0000-0000-000000000008', 'roles:revoke',       'ROLES',       'DELETE'),
('c2000001-0000-0000-0000-000000000009', 'inventory:read',     'INVENTORY',   'READ'),
('c2000001-0000-0000-0000-000000000010', 'inventory:manage',   'INVENTORY',   'UPDATE'),
('c2000001-0000-0000-0000-000000000011', 'reports:read',       'REPORTS',     'READ'),
('c2000001-0000-0000-0000-000000000012', 'reports:create',     'REPORTS',     '66EATE'),
('c2000001-0000-0000-0000-000000000013', 'reports:approve',    'REPORTS',     'APPROVE'),
('c2000001-0000-0000-0000-000000000014', 'TRAINings:read',     'TRAININGS',   'READ'),
('c2000001-0000-0000-0000-000000000015', 'TRAINings:validate', 'TRAININGS',   'APPROVE'),
('c2000001-0000-0000-0000-000000000016', 'audit:read',         'AUDIT',       'READ');

-- ─── 4.16 ROLE_PERMISSIONS ─────────────────────────────────────────────────
INSERT INTO role_permissions (role_def_id, permission_id, data_scope) VALUES
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000002','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000003','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000004','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000005','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000006','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000007','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000008','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000009','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000010','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000013','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000014','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000015','CHILDREN'),
('c1000001-0000-0000-0000-000000000001','c2000001-0000-0000-0000-000000000016','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000003','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000005','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000009','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000002','c2000001-0000-0000-0000-000000000014','CHILDREN'),
('c1000001-0000-0000-0000-000000000003','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000003','c2000001-0000-0000-0000-000000000003','CHILDREN'),
('c1000001-0000-0000-0000-000000000003','c2000001-0000-0000-0000-000000000005','CHILDREN'),
('c1000001-0000-0000-0000-000000000003','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000003','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000003','c2000001-0000-0000-0000-000000000014','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000009','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000010','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000014','CHILDREN'),
('c1000001-0000-0000-0000-000000000004','c2000001-0000-0000-0000-000000000015','CHILDREN'),
('c1000001-0000-0000-0000-000000000005','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000005','c2000001-0000-0000-0000-000000000009','CHILDREN'),
('c1000001-0000-0000-0000-000000000005','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000005','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000005','c2000001-0000-0000-0000-000000000014','CHILDREN'),
('c1000001-0000-0000-0000-000000000005','c2000001-0000-0000-0000-000000000015','CHILDREN'),
('c1000001-0000-0000-0000-000000000006','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000006','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000006','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000006','c2000001-0000-0000-0000-000000000014','CHILDREN'),
('c1000001-0000-0000-0000-000000000007','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000007','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000007','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000008','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000008','c2000001-0000-0000-0000-000000000009','CHILDREN'),
('c1000001-0000-0000-0000-000000000008','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000008','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000009','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000009','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000009','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000010','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000010','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000010','c2000001-0000-0000-0000-000000000012','CHILDREN'),
('c1000001-0000-0000-0000-000000000011','c2000001-0000-0000-0000-000000000001','CHILDREN'),
('c1000001-0000-0000-0000-000000000011','c2000001-0000-0000-0000-000000000009','CHILDREN'),
('c1000001-0000-0000-0000-000000000011','c2000001-0000-0000-0000-000000000010','CHILDREN'),
('c1000001-0000-0000-0000-000000000011','c2000001-0000-0000-0000-000000000011','CHILDREN'),
('c1000001-0000-0000-0000-000000000011','c2000001-0000-0000-0000-000000000012','CHILDREN');

-- ─── 4.17 COMMITTEE_ROLES ──────────────────────────────────────────────────
INSERT INTO committee_roles (id, role_def_id, title, committee_id, volunteer_id, status, approved_by, approved_at, assigned_at, mandate_end_date) VALUES
-- National Committee
('c3000001-0000-0000-0000-000000000001','c1000001-0000-0000-0000-000000000001','PRESIDENT',          'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','APPROVED','00000000-0000-0000-0000-000000000001','2024-01-15','2024-01-15','2028-01-15'),
('c3000001-0000-0000-0000-000000000002','c1000001-0000-0000-0000-000000000002','VICE_PRESIDENT',     'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','APPROVED','00000000-0000-0000-0000-000000000001','2024-01-15','2024-01-15','2028-01-15'),
('c3000001-0000-0000-0000-000000000003','c1000001-0000-0000-0000-000000000003','SECRETAIRE_GENERAL', 'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','APPROVED','00000000-0000-0000-0000-000000000001','2024-01-15','2024-01-15','2028-01-15'),
('c3000001-0000-0000-0000-000000000004','c1000001-0000-0000-0000-000000000004','RESP_SECOURISME',    'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000005','c1000001-0000-0000-0000-000000000005','RESP_SANTE',         'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000006','c1000001-0000-0000-0000-000000000006','RESP_JEUNESSE',      'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000007','c1000001-0000-0000-0000-000000000007','RESP_DIFFUSION',     'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000007','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000008','c1000001-0000-0000-0000-000000000008','RESP_ACTION_SOCIALE','a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000008','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000009','c1000001-0000-0000-0000-000000000009','RESP_VFF',           'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000009','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000010','c1000001-0000-0000-0000-000000000010','RESP_IMMIGRATION',   'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000010','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
('c3000001-0000-0000-0000-000000000011','c1000001-0000-0000-0000-000000000011','RESP_CATASTROPHES',  'a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000011','APPROVED','10000000-0000-0000-0000-000000000001','2024-01-16','2024-01-16','2028-01-15'),
-- Regional Tunis
('c3000002-0000-0000-0000-000000000001','c1000001-0000-0000-0000-000000000001','PRESIDENT',          'b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','APPROVED','10000000-0000-0000-0000-000000000001','2025-01-10','2025-01-10','2029-01-10'),
('c3000002-0000-0000-0000-000000000002','c1000001-0000-0000-0000-000000000003','SECRETAIRE_GENERAL', 'b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','APPROVED','10000000-0000-0000-0000-000000000001','2025-01-10','2025-01-10','2029-01-10'),
('c3000002-0000-0000-0000-000000000003','c1000001-0000-0000-0000-000000000005','RESP_SANTE',         'b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','APPROVED','20000000-0000-0000-0000-000000000001','2025-01-11','2025-01-11','2029-01-10'),
('c3000002-0000-0000-0000-000000000004','c1000001-0000-0000-0000-000000000004','RESP_SECOURISME',    'b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004','APPROVED','20000000-0000-0000-0000-000000000001','2025-01-11','2025-01-11','2029-01-10'),
('c3000002-0000-0000-0000-000000000005','c1000001-0000-0000-0000-000000000006','RESP_JEUNESSE',      'b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005','APPROVED','20000000-0000-0000-0000-000000000001','2025-01-11','2025-01-11','2029-01-10'),
('c3000002-0000-0000-0000-000000000006','c1000001-0000-0000-0000-000000000008','RESP_ACTION_SOCIALE','b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000006','APPROVED','20000000-0000-0000-0000-000000000001','2025-01-11','2025-01-11','2029-01-10'),
('c3000002-0000-0000-0000-000000000007','c1000001-0000-0000-0000-000000000009','RESP_VFF',           'b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000007','APPROVED','20000000-0000-0000-0000-000000000001','2025-01-11','2025-01-11','2029-01-10'),
-- Regional Sousse
('c3000003-0000-0000-0000-000000000001','c1000001-0000-0000-0000-000000000001','PRESIDENT',          'b0000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000010','APPROVED','10000000-0000-0000-0000-000000000001','2025-03-01','2025-03-01','2029-03-01'),
('c3000003-0000-0000-0000-000000000002','c1000001-0000-0000-0000-000000000003','SECRETAIRE_GENERAL', 'b0000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000011','APPROVED','10000000-0000-0000-0000-000000000001','2025-03-01','2025-03-01','2029-03-01'),
('c3000003-0000-0000-0000-000000000003','c1000001-0000-0000-0000-000000000004','RESP_SECOURISME',    'b0000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000012','APPROVED','20000000-0000-0000-0000-000000000010','2025-03-02','2025-03-02','2029-03-01'),
('c3000003-0000-0000-0000-000000000004','c1000001-0000-0000-0000-000000000010','RESP_IMMIGRATION',   'b0000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000013','APPROVED','20000000-0000-0000-0000-000000000010','2025-03-02','2025-03-02','2029-03-01'),
-- Regional Sfax
('c3000004-0000-0000-0000-000000000001','c1000001-0000-0000-0000-000000000001','PRESIDENT',          'b0000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000020','APPROVED','10000000-0000-0000-0000-000000000001','2025-05-01','2025-05-01','2029-05-01'),
('c3000004-0000-0000-0000-000000000002','c1000001-0000-0000-0000-000000000003','SECRETAIRE_GENERAL', 'b0000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000021','APPROVED','10000000-0000-0000-0000-000000000001','2025-05-01','2025-05-01','2029-05-01'),
('c3000004-0000-0000-0000-000000000003','c1000001-0000-0000-0000-000000000005','RESP_SANTE',         'b0000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000022','APPROVED','20000000-0000-0000-0000-000000000020','2025-05-02','2025-05-02','2029-05-01'),
-- Local Bardo
('c3000005-0000-0000-0000-000000000001','c1000001-0000-0000-0000-000000000001','PRESIDENT',          'c0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','APPROVED','20000000-0000-0000-0000-000000000001','2023-06-01','2023-06-01','2027-06-01'),
('c3000005-0000-0000-0000-000000000002','c1000001-0000-0000-0000-000000000003','SECRETAIRE_GENERAL', 'c0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','APPROVED','20000000-0000-0000-0000-000000000001','2023-06-01','2023-06-01','2027-06-01'),
('c3000005-0000-0000-0000-000000000003','c1000001-0000-0000-0000-000000000004','RESP_SECOURISME',    'c0000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','APPROVED','30000000-0000-0000-0000-000000000001','2023-06-02','2023-06-02','2027-06-01'),
('c3000005-0000-0000-0000-000000000004','c1000001-0000-0000-0000-000000000009','RESP_VFF',           'c0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','APPROVED','30000000-0000-0000-0000-000000000001','2023-06-02','2023-06-02','2027-06-01'),
('c3000005-0000-0000-0000-000000000005','c1000001-0000-0000-0000-000000000010','RESP_IMMIGRATION',   'c0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','APPROVED','30000000-0000-0000-0000-000000000001','2023-06-02','2023-06-02','2027-06-01'),
('c3000005-0000-0000-0000-000000000006','c1000001-0000-0000-0000-000000000011','RESP_CATASTROPHES',  'c0000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','APPROVED','30000000-0000-0000-0000-000000000001','2023-06-02','2023-06-02','2027-06-01'),
-- Local Ariana
('c3000006-0000-0000-0000-000000000001','c1000001-0000-0000-0000-000000000001','PRESIDENT',          'c0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003','APPROVED','20000000-0000-0000-0000-000000000001','2023-02-01','2023-02-01','2027-02-01'),
('c3000006-0000-0000-0000-000000000002','c1000001-0000-0000-0000-000000000003','SECRETAIRE_GENERAL', 'c0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000004','APPROVED','20000000-0000-0000-0000-000000000001','2023-02-01','2023-02-01','2027-02-01');

-- ─── 4.18 APPROVAL REQUESTS ────────────────────────────────────────────────
INSERT INTO approval_requests (id, volunteer_id, committee_id, status, assigned_to, reviewed_by, reviewed_at, review_notes, motivation) VALUES
('c4000001-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000070', 'c0000000-0000-0000-0000-000000000001', 'PENDING',  '30000000-0000-0000-0000-000000000001', NULL, NULL, NULL, 'Motivé à rejoindre le CRT pour devenir secouriste et aider ma communauté à Bardo.'),
('c4000001-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000071', 'b0000000-0000-0000-0000-000000000002', 'PENDING',  '20000000-0000-0000-0000-000000000010', NULL, NULL, NULL, 'Médecin souhaitant offrir des consultations bénévoles dans les zones rurales de Sousse.'),
('c4000001-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000080', 'c0000000-0000-0000-0000-000000000002', 'REJECTED', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '2025-02-15', 'Informations incohérentes. CIN non vérifiable.', 'Souhaite participer aux activités jeunesse.');

-- ─── 4.19 AUDIT LOG ────────────────────────────────────────────────────────
INSERT INTO audit_log (entity_table, entity_id, action_type, actor_id, actor_email, committee_ctx, old_values, new_values, changed_fields, reason) VALUES
('users',          '40000000-0000-0000-0000-000000000001', 'APPROVE', '30000000-0000-0000-0000-000000000001', 'president.bardo@crt.tn',  'c0000000-0000-0000-0000-000000000001', '{"account_status":"PENDING"}',                 '{"account_status":"APPROVED"}',              ARRAY['account_status','approved_by','approved_at'], 'Vérification identité complète. Formation PSE1 en cours. Dossier complet.'),
('users',          '40000000-0000-0000-0000-000000000080', 'REJECT',  '30000000-0000-0000-0000-000000000003', 'president.ariana@crt.tn', 'c0000000-0000-0000-0000-000000000002', '{"account_status":"PENDING"}',                 '{"account_status":"REJECTED"}',              ARRAY['account_status','rejection_reason'],          'Informations incohérentes. CIN non vérifiable après 3 tentatives de contact.'),
('committee_roles','c3000005-0000-0000-0000-000000000003', 'ASSIGN',  '30000000-0000-0000-0000-000000000001', 'president.bardo@crt.tn',  'c0000000-0000-0000-0000-000000000001', NULL,                                           '{"role":"RESP_SECOURISME","volunteer":"Ali Sghaier"}', ARRAY['role_def_id','volunteer_id','status'],   'Meilleur profil disponible. PSE1+RCP validés. Très motivé.'),
('committee_roles','c3000001-0000-0000-0000-000000000001', 'ASSIGN',  '00000000-0000-0000-0000-000000000001', 'superadmin@crt.tn',       'a0000000-0000-0000-0000-000000000001', NULL,                                           '{"role":"PRESIDENT","volunteer":"Ahmed Ben Salah"}', ARRAY['role_def_id','volunteer_id','status'],  'Élection du bureau national 2024-2028. Procès-verbal AG ref: PV-AN-2024-001.'),
('committees',     'b0000000-0000-0000-0000-000000000008', 'INSERT',  '00000000-0000-0000-0000-000000000001', 'superadmin@crt.tn',       'a0000000-0000-0000-0000-000000000001', NULL,                                           '{"name":"Comité Régional de Monastir","status":"PENDING_CONSTITUTION"}', ARRAY['name','type','region','status'], '66éation suite à décision du comité national réf: CN-DEC-2025-017.'),
('users',          '40000000-0000-0000-0000-000000000090', 'UPDATE',  '00000000-0000-0000-0000-000000000001', 'superadmin@crt.tn',       'b0000000-0000-0000-0000-000000000001', '{"account_status":"APPROVED"}',               '{"account_status":"SUSPENDED"}',             ARRAY['account_status'],                             'Suspension temporaire suite à comportement inapproprié signalé. Enquête en cours ref ENQ-2026-003.');

-- =============================================================================
