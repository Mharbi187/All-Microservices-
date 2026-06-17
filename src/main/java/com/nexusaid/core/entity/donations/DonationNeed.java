package com.nexusaid.core.entity.donations;

import com.nexusaid.core.entity.Committee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "donation_needs")
@Getter
@Setter
@NoArgsConstructor
public class DonationNeed {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee committee;

    @Column(nullable = false)
    private String type; // e.g., Alimentaire, Médical, Équipement, Vêtements, Urgence

    @Column(nullable = false)
    private String priority; // URGENT, NORMAL, LOW

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "quantity_needed")
    private String quantityNeeded;

    private Integer beneficiaries;

    @Column(nullable = false)
    private String status; // OPEN, IN_PROGRESS, COMPLETED

    @CreationTimestamp
    @Column(name = "published_at", updatable = false)
    private LocalDateTime publishedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
