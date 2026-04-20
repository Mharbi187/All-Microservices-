package com.nexusaid.admin.entity;

import com.nexusaid.admin.entity.enums.MonthlyReportStatus;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "monthly_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyReport {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "committee_id")
    private UUID committeeId;

    @Column(name = "responsible_id")
    private UUID responsibleId; // User who drafted the report

    @Column(name = "report_period", nullable = false)
    private LocalDate reportPeriod; // Month of the report

    @Column(name = "report_type", length = 50, nullable = false)
    private String reportType; // SECOURISME, SANTE, etc.

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String content; // Structured content of the report

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MonthlyReportStatus status;

    @Column(name = "validated_by")
    private UUID validatedBy; // Secrétaire Général who validated

    @Column(name = "finalized_by")
    private UUID finalizedBy; // Président who finalized

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = MonthlyReportStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
