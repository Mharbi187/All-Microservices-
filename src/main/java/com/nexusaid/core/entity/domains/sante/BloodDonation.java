package com.nexusaid.core.entity.domains.sante;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "blood_donations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BloodDonation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "donor_volunteer_id", nullable = false)
    private UUID donorVolunteerId;

    @Column(name = "committee_id")
    private UUID committeeId;

    @Column(name = "blood_type", nullable = false)
    private String bloodType; // e.g., A+, O-, B+

    @Column(name = "donation_date", nullable = false)
    private LocalDate donationDate;

    @Column(name = "collection_center")
    private String collectionCenter;

    private String zone;

    @Column(nullable = false)
    private double quantity; // e.g., 450.0 ml

    @Column(nullable = false)
    private String status; // ACCEPTED, REJECTED, TESTED, USED

    @Column(length = 500)
    private String notes;

    // --- Hôpital & Bénéficiaire ---
    @Column(name = "hospital_destination", length = 300)
    private String hospitalDestination;

    @Column(name = "beneficiary_name", length = 200)
    private String beneficiaryName;

    // --- Volontaires ---
    @Column(name = "volunteers_needed")
    private Boolean volunteersNeeded;

    @Column(name = "volunteers_count")
    private int volunteersCount;

    // --- Chef d'action ---
    @Column(name = "action_chief_name", length = 200)
    private String actionChiefName;

    @Column(name = "action_chief_id")
    private UUID actionChiefId;

    // --- Médias ---
    @Type(JsonBinaryType.class)
    @Column(name = "photos_urls", columnDefinition = "jsonb")
    private List<String> photosUrls;

    @Type(JsonBinaryType.class)
    @Column(name = "volunteers_list", columnDefinition = "jsonb")
    private List<java.util.Map<String, String>> volunteersList;

    // --- Traçabilité ---
    @Column(name = "created_by")
    private UUID createdBy;

    @PrePersist
    public void prePersist() {
        if (this.donorVolunteerId == null) {
            this.donorVolunteerId = UUID.randomUUID(); // Fallback to avoid constraint error
        }
        if (this.status == null) {
            this.status = "ACCEPTED";
        }
    }
}
