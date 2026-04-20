package com.nexusaid.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "report_instances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
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
