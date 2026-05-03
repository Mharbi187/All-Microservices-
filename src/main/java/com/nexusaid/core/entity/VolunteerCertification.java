package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "volunteer_certifications",
       uniqueConstraints = @UniqueConstraint(columnNames = {"volunteer_id", "certification_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VolunteerCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "volunteer_id", nullable = false)
    private UUID volunteerId;

    @Column(name = "certification_id", nullable = false)
    private UUID certificationId;

    @Column(name = "date_obtained", nullable = false)
    private LocalDate dateObtained;

    @Column(name = "date_expiry")
    private LocalDate dateExpiry;

    @Column(name = "issued_by")
    private String issuedBy;

    @Column(name = "document_url", length = 512)
    private String documentUrl;

    /** ACTIVE, EXPIRED, PENDING_RECYCLING */
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "added_by")
    private UUID addedBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Transient for display
    @Transient
    private String certificationCode;
    @Transient
    private String certificationLabel;
}
