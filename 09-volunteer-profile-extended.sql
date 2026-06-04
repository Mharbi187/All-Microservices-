-- =============================================================================
-- NEXUS-AID — 09-volunteer-profile-extended.sql
-- Table séparée pour le formulaire complémentaire obligatoire (première connexion)
-- + Catalogue certifications secourisme dynamique
-- + Associations volontaire↔certification
-- =============================================================================
\c nexusaid_db;

-- ─── ÉDUCATION : ENUM TYPE ──────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE education_level AS ENUM (
        'MOINS_BAC', 'BAC', 'BAC_PLUS_1_2', 'LICENCE', 'MASTER', 'DOCTORAT'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── PROFIL ÉTENDU VOLONTAIRE ────────────────────────────────────────────────
-- Table flexible : champs complémentaires non-bloquants au niveau entité User
CREATE TABLE IF NOT EXISTS volunteer_extended_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL UNIQUE REFERENCES volunteers(id) ON DELETE CASCADE,

    -- Coordonnées
    phone VARCHAR(30),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(30),
    emergency_contact_relation VARCHAR(100),

    -- Photo profil (URL Cloudinary)
    photo_url VARCHAR(512),
    photo_public_id VARCHAR(255),

    -- Formation académique
    education_level education_level,
    specialization_domain VARCHAR(255),
    training_courses_attended TEXT, -- liste JSON ou texte libre

    -- Intégration CRT
    real_integration_date DATE,
    other_skills TEXT,

    -- Approbation du profil étendu
    -- NULL = non soumis, FALSE = soumis en attente validation, TRUE = approuvé
    profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
    profile_completion_score INTEGER NOT NULL DEFAULT 0, -- 0-100

    -- Workflow validation du profil étendu
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),     -- RESP_JEUNESSE_NATIONAL ou PRESIDENT_NATIONAL
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATALOGUE CERTIFICATIONS SECOURISME ────────────────────────────────────
-- Configurable dynamiquement depuis la DB (pas hardcodé en frontend)
CREATE TABLE IF NOT EXISTS secourisme_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,       -- ex: PSC1, PSE1, PSE2
    label VARCHAR(255) NOT NULL,            -- nom complet
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,       -- niveau hiérarchique (1=base, 3=avancé)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    editable_by JSONB NOT NULL DEFAULT '["RESP_SECOURISME", "RESP_JEUNESSE", "PRESIDENT"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ASSOCIATIONS VOLONTAIRE ↔ CERTIFICATION ─────────────────────────────────
CREATE TABLE IF NOT EXISTS volunteer_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES secourisme_certifications(id),
    date_obtained DATE NOT NULL,
    date_expiry DATE,
    issued_by VARCHAR(255),          -- organisme émetteur
    document_url VARCHAR(512),       -- URL justificatif Cloudinary
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, PENDING_RECYCLING
    notes TEXT,
    added_by UUID REFERENCES users(id),  -- qui a ajouté cette certification
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(volunteer_id, certification_id)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vep_volunteer_id ON volunteer_extended_profiles(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vep_profile_completed ON volunteer_extended_profiles(profile_completed);
CREATE INDEX IF NOT EXISTS idx_vc_volunteer_id ON volunteer_certifications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vc_certification_id ON volunteer_certifications(certification_id);
CREATE INDEX IF NOT EXISTS idx_vc_status ON volunteer_certifications(status);

-- ─── CATALOGUE CERTIFICATIONS PAR DÉFAUT ────────────────────────────────────
INSERT INTO secourisme_certifications (code, label, description, level, editable_by) VALUES
    ('PSC1',     'Prévention et Secours Civiques de niveau 1',
     'Formation de base aux premiers secours pour tous les citoyens. Durée : 7h.',
     1, '["RESP_SECOURISME", "RESP_JEUNESSE", "PRESIDENT"]'),

    ('PSE1',     'Premiers Secours en Équipe de niveau 1',
     'Formation aux gestes de premiers secours en équipe. Prérequis : PSC1. Durée : 35h.',
     2, '["RESP_SECOURISME", "RESP_JEUNESSE", "PRESIDENT"]'),

    ('PSE2',     'Premiers Secours en Équipe de niveau 2',
     'Approfondissement des techniques de secours en équipe. Prérequis : PSE1. Durée : 35h.',
     3, '["RESP_SECOURISME", "RESP_JEUNESSE", "PRESIDENT"]'),

    ('FORMATEUR_PS', 'Formateur en Premiers Secours Certifié',
     'Habilitation à former d''autres secouristes. Prérequis : PSE2 + expérience terrain.',
     4, '["RESP_SECOURISME", "PRESIDENT"]'),

    ('SAMU_COLLAB', 'Collaboration SAMU / Urgences',
     'Formation de coopération avec les services d''urgence médicale publics.',
     3, '["RESP_SECOURISME", "PRESIDENT"]'),

    ('ANESTHESIE_BASE', 'Notions d''anesthésie et soins post-urgence',
     'Module complémentaire pour volontaires avancés.',
     3, '["RESP_SECOURISME", "PRESIDENT"]')
ON CONFLICT (code) DO NOTHING;

-- ─── AJOUT COLONNE gouvernorat SUR volunteers (pour cascade inscription) ────
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS gouvernorat VARCHAR(100);

-- ─── AJOUT COLONNE first_login_completed SUR users ──────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── COMMENTAIRES DOCUMENTATION ─────────────────────────────────────────────
COMMENT ON TABLE volunteer_extended_profiles IS
    'Formulaire complémentaire obligatoire — rempli lors de la 1ère connexion après approbation. Table séparée pour flexibilité (ajout/suppression de champs sans migration lourde).';

COMMENT ON TABLE secourisme_certifications IS
    'Catalogue des certifications secourisme configurables dynamiquement. Modifiable par RESP_SECOURISME, RESP_JEUNESSE et PRESIDENT selon le champ editable_by.';

COMMENT ON TABLE volunteer_certifications IS
    'Associations many-to-many entre volontaires et certifications avec métadonnées (date, expiry, document justificatif).';
