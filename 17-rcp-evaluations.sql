-- ============================================================
-- NEXUS-AID — RCP Evaluation Table
-- Formulaire d'évaluation de l'assistant IA-RCP
-- Rempli par les formateurs RESP_SECOURISME / RCP uniquement
-- ============================================================

CREATE TABLE IF NOT EXISTS rcp_evaluations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id            UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    trainer_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    trainer_name            VARCHAR(255) NOT NULL,
    trainer_center          VARCHAR(255),
    ai_version              VARCHAR(100),
    evaluation_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    evaluation_time         TIME,
    participant_name        VARCHAR(255),
    participant_level       VARCHAR(50) CHECK (participant_level IN ('DEBUTANT','INTERMEDIAIRE','AVANCE','PROFESSIONNEL')),
    total_attempts          INTEGER DEFAULT 1,

    -- Photos (base64 encoded)
    photo_participant       TEXT,
    photo_cardiac_position  TEXT,
    photo_ai_screenshot     TEXT,
    video_test_url          TEXT,

    -- Section scores (JSONB: {"handPosition":4,"depth":3,"frequency":5,...})
    scores                  JSONB DEFAULT '{}',

    -- Commentaires par critère (JSONB: {"handPosition":"Bonne position","depth":"..."})
    comments                JSONB DEFAULT '{}',

    -- Problèmes rencontrés (JSONB: ["fausses_alertes","detection_retard",...])
    problems_encountered    JSONB DEFAULT '[]',
    problem_description     TEXT,

    -- Résultats
    score_ia                NUMERIC(4,1),
    score_trainer           NUMERIC(4,1),
    concordance_level       VARCHAR(50) CHECK (concordance_level IN ('EXCELLENT','BON','MOYEN','FAIBLE')),
    concordance_gap         NUMERIC(4,1),

    -- Recommandations (JSONB avec trois niveaux)
    recommendations         JSONB DEFAULT '{"high":[],"medium":[],"low":[]}',

    -- Décision du formateur
    trainer_decision        VARCHAR(100) CHECK (trainer_decision IN ('PRET','AMELIORATIONS_MINEURES','AMELIORATIONS_MAJEURES','NON_RECOMMANDE')),
    trainer_final_comments  TEXT,
    trainer_signature       TEXT,

    -- Metadata
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rcp_evaluations_committee ON rcp_evaluations(committee_id);
CREATE INDEX IF NOT EXISTS idx_rcp_evaluations_trainer   ON rcp_evaluations(trainer_id);
CREATE INDEX IF NOT EXISTS idx_rcp_evaluations_date      ON rcp_evaluations(evaluation_date DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rcp_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rcp_evaluations_updated_at ON rcp_evaluations;
CREATE TRIGGER trg_rcp_evaluations_updated_at
    BEFORE UPDATE ON rcp_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_rcp_evaluations_updated_at();
