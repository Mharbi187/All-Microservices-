package com.nexusaid.core.entity.domains.sante;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
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

    @PrePersist
    public void prePersist() {
        if (this.donorVolunteerId == null) {
            this.donorVolunteerId = UUID.randomUUID(); // Fallback to avoid constraint error
        }
    }
}
