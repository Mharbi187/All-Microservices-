-- V8: Add PDF metadata and assigned users

ALTER TABLE report_instances
ADD COLUMN pdf_url VARCHAR(1024),
ADD COLUMN pdf_generated_at TIMESTAMP,
ADD COLUMN pdf_version INTEGER DEFAULT 1;

CREATE TABLE report_assigned_users (
    report_id UUID NOT NULL,
    user_id UUID NOT NULL,
    CONSTRAINT fk_report_assigned_users_report FOREIGN KEY (report_id) REFERENCES report_instances(id) ON DELETE CASCADE
);
