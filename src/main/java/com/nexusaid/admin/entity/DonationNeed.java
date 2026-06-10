package com.nexusaid.admin.entity;

import com.nexusaid.admin.entity.enums.DonationCategory;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Besoin de don créé par un Responsable de Comité.
 * Workflow : PENDING_VALIDATION → (VALIDATED | REJECTED) → FULFILLED
 * Les Présidents/VP du comité concerné valident ou rejettent.
 */
@Entity
@Table(name = "donation_needs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationNeed {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** UUID du comité auquel appartient ce besoin (référence MS1) */
    @Column(nullable = false)
    private UUID committeeId;

    /** Type du comité : LOCAL, REGIONAL, NATIONAL */
    @Column(nullable = false)
    private String committeeType;

    /** Nom du comité pour affichage sans appel Feign */
    private String committeeName;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DonationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NeedsStatus status;

    private BigDecimal targetAmount;
    private Integer targetQuantity;
    private BigDecimal currentAmount;
    private Integer currentQuantity;

    // ─── Créateur (Responsable de Comité) ─────────────────────────────────────

    /** UUID de l'utilisateur qui a créé ce besoin */
    @Column(nullable = false)
    private UUID createdBy;

    /** Nom complet du créateur pour affichage */
    private String creatorName;

    /** Titre du rôle du créateur (ex: RESP_SECOURISME) */
    @Column(name = "created_by_role", nullable = false)
    private String creatorRoleName;

    // ─── Validation (Président / VP) ──────────────────────────────────────────

    /** UUID du valideur (Président ou VP) */
    private UUID validatedBy;

    /** Nom complet du valideur */
    private String validatorName;

    /** Date/heure de validation */
    private LocalDateTime validatedAt;

    // ─── Rejet ────────────────────────────────────────────────────────────────

    /** UUID de celui qui a rejeté */
    private UUID rejectedBy;

    /** Nom complet du rejeteur */
    private String rejectorName;

    /** Date/heure du rejet */
    private LocalDateTime rejectedAt;

    /** Motif de rejet — OBLIGATOIRE si REJECTED */
    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
