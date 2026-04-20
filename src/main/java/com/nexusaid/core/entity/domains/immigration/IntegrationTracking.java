package com.nexusaid.core.entity.domains.immigration;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "integration_tracking")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntegrationTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "migrant_case_id", nullable = false)
    private UUID migrantCaseId;

    @Column(name = "language_course_enrolled")
    private boolean languageCourseEnrolled;

    @Column(name = "language_level")
    private String languageLevel; // A1, A2, B1, etc.

    @Column(name = "legal_assistance_provided")
    private boolean legalAssistanceProvided;

    @Column(name = "social_insertion")
    private String socialInsertion; // Employed, In School, Looking for Work

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> milestones; // Key dates or achievements

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
