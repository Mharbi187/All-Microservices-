\c nexusaid_admin;
-- Migration script for event_logs table
-- Run this on the nexusaid_admin database

CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_source VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    related_entity_id VARCHAR(36),
    related_entity_type VARCHAR(50),
    committee_id UUID,
    FOREIGN KEY (committee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_source ON event_logs(event_source);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_status ON event_logs(status);
CREATE INDEX IF NOT EXISTS idx_event_logs_related_entity ON event_logs(related_entity_id, related_entity_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_committee ON event_logs(committee_id);

-- Optional: Create a materialized view for quick statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS event_logs_stats AS
SELECT
    event_type,
    event_source,
    COUNT(*) as count,
    MAX(created_at) as last_event_at
FROM event_logs
GROUP BY event_type, event_source;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_logs_stats ON event_logs_stats(event_type, event_source);

