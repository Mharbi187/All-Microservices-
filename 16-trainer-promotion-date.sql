-- =====================================================================
-- Migration 16 : Ajouter promoted_at à la table trainers
-- Permet le calcul de l'expiration Secourisme (2 ans)
-- =====================================================================

-- Ajouter la colonne promoted_at
ALTER TABLE trainers
    ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ DEFAULT NOW();

-- Remplir les lignes existantes
UPDATE trainers SET promoted_at = NOW() WHERE promoted_at IS NULL;
