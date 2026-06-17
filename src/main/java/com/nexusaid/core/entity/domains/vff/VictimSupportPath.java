package com.nexusaid.core.entity.domains.vff;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "victim_support_paths")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VictimSupportPath {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "victim_case_id", nullable = false)
    private UUID victimCaseId;

    @Type(JsonBinaryType.class)
    @Column(name = "medical_follow_up", columnDefinition = "jsonb")
    private Map<String, Object> medicalFollowUp;

    @Type(JsonBinaryType.class)
    @Column(name = "psychological_follow_up", columnDefinition = "jsonb")
    private Map<String, Object> psychologicalFollowUp;

    @Type(JsonBinaryType.class)
    @Column(name = "legal_follow_up", columnDefinition = "jsonb")
    private Map<String, Object> legalFollowUp;

    @Type(JsonBinaryType.class)
    @Column(name = "shelter_info", columnDefinition = "jsonb")
    private Map<String, Object> shelterInfo;

    @Column(name = "police_report")
    private boolean policeReport;

    @Column(name = "court_case_ref")
    private String courtCaseRef;

    @Column(name = "current_stage")
    private String currentStage; // REPORTED, ACCOMMODATED, LEGAL_ACTION, RECOVERED

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
