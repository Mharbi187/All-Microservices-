package com.nexusaid.core.entity.donations;

import com.nexusaid.core.entity.Donor;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "donations")
@Getter
@Setter
@NoArgsConstructor
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "donation_number", unique = true, updatable = false)
    private String donationNumber; // Generated like DON-2026-000123

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_id", nullable = false)
    private DonationNeed need;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private Donor donor;

    @Column(name = "donation_type", nullable = false)
    private String donationType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String quantity;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(nullable = false)
    private String status; // PENDING_RECEPTION, RECEIVED, VALIDATED

    @OneToOne(mappedBy = "donation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private DonationReceipt receipt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
