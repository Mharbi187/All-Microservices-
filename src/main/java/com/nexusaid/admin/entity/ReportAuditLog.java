package com.nexusaid.admin.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.UUID;

/**
 * Tamper-proof log of every workflow transition on a ReportInstance.
 * Never deleted — provides a full audit trail for compliance.
 */
@Entity
@Table(name = "report_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    /**
     * One of: CREATED, SUBMITTED, VALIDATED, FINALIZED, ARCHIVED
     */
    @Column(name = "action", nullable = false, length = 64)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant performedAt = Instant.now();

    /** Optional snapshot of changed fields for forensic purposes */
    @Type(JsonBinaryType.class)
    @Column(name = "details", columnDefinition = "jsonb")
    private JsonNode details;
}
