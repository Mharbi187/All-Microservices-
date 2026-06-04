package com.nexusaid.core.entity.domains.jeunesse;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "youth_recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YouthRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "form_id", nullable = true)
    private UUID formId; // Links back to YouthIntegrationForm

    @Column(name = "committee_id")
    private UUID committeeId; // For general published recommendations

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "category")
    private String category;

    @Column(name = "target")
    private String target; // e.g. LOCAL, REGIONAL, NATIONAL

    @Column(name = "priority")
    private String priority;

    @Column(name = "status")
    private String status; // PENDING_VALIDATION, APPROVED, REJECTED, ACTIVE

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Type(JsonBinaryType.class)
    @Column(name = "recommended_training_ia", columnDefinition = "jsonb")
    private List<String> recommendedTrainingIA;

    @Type(JsonBinaryType.class)
    @Column(name = "recommended_missions", columnDefinition = "jsonb")
    private List<String> recommendedMissions;

    @Column(name = "confidence_score")
    private double confidenceScore;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = LocalDateTime.now();
    }
}
