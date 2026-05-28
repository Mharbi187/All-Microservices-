package com.nexusaid.core.entity.domains.sante;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Représente une demande de distribution de ressources médicales.
 * Doit être approuvée par le Président du comité avant d'être visible dans la page Ressources.
 */
@Entity
@Table(name = "medical_distributions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalDistribution {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "committee_id", nullable = false)
    private UUID committeeId;

    /**
     * Type de ressource médicale :
     * MEDICAMENTS, KITS_MEDICAUX, POCHES_SANG, EQUIPEMENTS,
     * DISPOSITIFS_MEDICAUX, DOCUMENTS_MEDICAUX, AUTRES
     */
    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 2000)
    private String description;

    /**
     * Destination : hôpital, association, mission, comité, bénéficiaire
     */
    @Column(name = "destination_type", length = 100)
    private String destinationType; // HOPITAL, ASSOCIATION, MISSION, COMITE, BENEFICIAIRE

    @Column(name = "destination_name", length = 300)
    private String destinationName;

    @Column(name = "destination_address", length = 500)
    private String destinationAddress;

    private int quantity;

    @Column(name = "unit", length = 50)
    private String unit; // unités, boîtes, poches, etc.

    /**
     * Statut du cycle de validation :
     * PENDING → APPROVED (par Président) → DISTRIBUTED
     * ou PENDING → REJECTED
     */
    @Column(nullable = false, length = 50)
    private String status; // PENDING, APPROVED, REJECTED, DISTRIBUTED

    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;

    @Column(name = "requested_by_name", length = 200)
    private String requestedByName;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_by_name", length = 200)
    private String approvedByName;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "notes", length = 1000)
    private String notes;

    // --- Médias & Documents ---
    @Type(JsonBinaryType.class)
    @Column(name = "photos_urls", columnDefinition = "jsonb")
    private List<String> photosUrls;

    @Type(JsonBinaryType.class)
    @Column(name = "documents_urls", columnDefinition = "jsonb")
    private List<String> documentsUrls;

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
        if (this.status == null)
            this.status = "PENDING";
        if (this.resourceType == null)
            this.resourceType = "AUTRES";
    }
}
