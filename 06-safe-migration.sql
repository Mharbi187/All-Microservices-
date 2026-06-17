-- =============================================================================
-- NEXUS-AID — 06-safe-migration.sql
-- Safe password migration script (NON-DESTRUCTIVE)
-- Run this if the DB already exists and you need to update passwords to 'pass'
-- BCrypt for 'pass': $2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO
-- Does NOT change: account_status, user_type, or any other field
-- =============================================================================
\c nexusaiddb;

-- Update all user passwords to BCrypt hash for 'pass'
-- Only updates password column, preserves all statuses intact
UPDATE users
SET password = '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO',
    updated_at = NOW()
WHERE password != '$2a$10$EKsszbFgp692dcbMdE8ZL.KDMoL6x/U0ze8jq7JZjJwnBynHm2NCO';

-- Confirmation output
SELECT
    email,
    user_type,
    account_status,
    'password=pass (updated)' AS password_info
FROM users
ORDER BY user_type, account_status, email;
