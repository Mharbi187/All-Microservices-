package com.nexusaid.admin.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "report_instances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ReportInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private Template template;

    @Column(name = "filled_by", nullable = false)
    private UUID filledBy; // User completing the report

    @Column(nullable = false)
    private String title;

    @Column(name = "workflow_status", length = 30)
    @Builder.Default
    private String workflowStatus = "DRAFT"; // DRAFT, SUBMITTED, VALIDATED, ARCHIVED

    @Column(name = "report_level", length = 30, nullable = false)
    private String reportLevel; // e.g. URGENT, NORMAL

    @Column(name = "validated_by")
    private UUID validatedBy;

    @Column(name = "finalized_by")
    private UUID finalizedBy;

    // ── v2 fields ───────────────────────────────────────────────────────

    /** JSONB-based form data (v2 templates) */
    @Type(JsonBinaryType.class)
    @Column(name = "filled_data", columnDefinition = "jsonb")
    private JsonNode filledData;

    /**
     * Pinned to the exact published TemplateVersion used at report creation.
     * Never changes — ensures stable rendering of historical reports.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_version_id")
    private TemplateVersion templateVersion;

    /** SHA-256 of filledData at archive time — proves content was not tampered */
    @Column(name = "content_hash", length = 64)
    private String contentHash;

    /** MinIO key of the PDF generated and stored at archive time */
    @Column(name = "pdf_storage_key", length = 512)
    private String pdfStorageKey;

    @Column(name = "pdf_url", length = 1024)
    private String pdfUrl;

    @Column(name = "pdf_generated_at")
    private LocalDateTime pdfGeneratedAt;

    @Column(name = "pdf_version")
    @Builder.Default
    private Integer pdfVersion = 1;

    @ElementCollection
    @CollectionTable(name = "report_assigned_users", joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<UUID> assignedUsers = new HashSet<>();

    /** User who triggered the ARCHIVED transition */
    @Column(name = "archived_by")
    private UUID archivedBy;

    @Column(name = "finalized_at")
    private Instant finalizedAt;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<ReportBlockData> dataBlocks = new ArrayList<>();

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addDataBlock(ReportBlockData dataBlock) {
        dataBlocks.add(dataBlock);
        dataBlock.setReport(this);
    }
}
