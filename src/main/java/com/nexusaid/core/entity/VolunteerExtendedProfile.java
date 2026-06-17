package com.nexusaid.core.entity;

import com.nexusaid.core.entity.enums.EducationLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Table séparée pour le formulaire complémentaire obligatoire.
 * Rempli lors de la 1ère connexion après approbation.
 * Flexible: champs ajoutables/supprimables sans impacter User/Volunteer.
 * Modifiable par RESP_JEUNESSE_NATIONAL, validé par PRESIDENT_NATIONAL.
 */
@Entity
@Table(name = "volunteer_extended_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VolunteerExtendedProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "volunteer_id", nullable = false, unique = true)
    private UUID volunteerId;

    // ─── Coordonnées ─────────────────────────────────────────────────────────
    private String phone;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "emergency_contact_relation")
    private String emergencyContactRelation;

    // ─── Photo profil ────────────────────────────────────────────────────────
    @Column(name = "photo_url", length = 512)
    private String photoUrl;

    @Column(name = "photo_public_id")
    private String photoPublicId;

    // ─── Formation académique ─────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "education_level", columnDefinition = "education_level")
    private EducationLevel educationLevel;

    @Column(name = "specialization_domain")
    private String specializationDomain;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "training_courses_attended", columnDefinition = "text")
    private String trainingCoursesAttended;

    // ─── Intégration CRT ─────────────────────────────────────────────────────
    @Column(name = "real_integration_date")
    private LocalDate realIntegrationDate;

    @Column(name = "other_skills", columnDefinition = "text")
    private String otherSkills;

    // ─── Workflow validation ──────────────────────────────────────────────────
    @Column(name = "profile_completed", nullable = false)
    private boolean profileCompleted = false;

    @Column(name = "profile_completion_score", nullable = false)
    private int profileCompletionScore = 0;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_notes", columnDefinition = "text")
    private String reviewNotes;

    // ─── Métadonnées ─────────────────────────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
