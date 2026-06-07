-- V10__add_donation_needs_fields.sql
-- Add missing columns to donation_needs table in nexusaid_admin database

ALTER TABLE donation_needs
ADD COLUMN IF NOT EXISTS committee_type VARCHAR(255) NOT NULL DEFAULT 'LOCAL',
ADD COLUMN IF NOT EXISTS committee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS creator_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS validated_by UUID,
ADD COLUMN IF NOT EXISTS validator_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID,
ADD COLUMN IF NOT EXISTS rejector_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Seed created_by from created_by_role if the latter exists and created_by is null
UPDATE donation_needs SET created_by = created_by_role WHERE created_by IS NULL;

-- Set created_by NOT NULL constraint (since in entity createdBy is @Column(nullable = false))
ALTER TABLE donation_needs ALTER COLUMN created_by SET NOT NULL;
