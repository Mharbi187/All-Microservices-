-- V9__update_template_version_status.sql
-- Replace is_published boolean with status string

ALTER TABLE template_versions ADD COLUMN status VARCHAR(30) DEFAULT 'DRAFT';

-- Migrate existing data
UPDATE template_versions SET status = 'PUBLISHED' WHERE is_published = true;
UPDATE template_versions SET status = 'DRAFT' WHERE is_published = false;

ALTER TABLE template_versions ALTER COLUMN status SET NOT NULL;
ALTER TABLE template_versions DROP COLUMN is_published;

-- Create audit table
CREATE TABLE template_version_audits (
    id UUID PRIMARY KEY,
    template_version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
