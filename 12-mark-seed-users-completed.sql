-- =============================================================================
-- NEXUS-AID — 12-mark-seed-users-completed.sql
-- Force all existing (seeded) approved users to have first_login_completed = true
-- This ensures the Onboarding Modal DOES NOT trigger for pre-existing / hard-coded 
-- presidents, admins, and active volunteers, while keeping it FALSE for real 
-- newly registered volunteers who get approved via the dashboard.
-- =============================================================================

\c nexusaiddb;

UPDATE users SET first_login_completed = true WHERE account_status = 'APPROVED';
