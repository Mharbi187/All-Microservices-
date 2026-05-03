package com.nexusaid.admin.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable snapshot of a template's structure at a specific version.
 * Once published, a TemplateVersion must NOT be modified.
 * Reports are pinned to the exact version used at creation time.
 */
@Entity
@Table(name = "template_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TemplateVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Parent template header */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Template template;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    /** Full JSONB document layout — the canonical structure of this version */
    @Type(JsonBinaryType.class)
    @Column(name = "structure", columnDefinition = "jsonb", nullable = false)
    private JsonNode structure;

    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    /** A published version is immutable and available for report creation */
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, PUBLISHED, ARCHIVED
}
