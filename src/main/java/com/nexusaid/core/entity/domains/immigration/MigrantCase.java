package com.nexusaid.core.entity.domains.immigration;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "migrant_cases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MigrantCase {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String nationality;

    @Column(name = "arrival_date")
    private LocalDate arrivalDate;

    @Column(name = "current_status")
    private String currentStatus; // ACTIVE, SETTLED, TRANSITED

    @Column(name = "legal_situation")
    private String legalSituation; // e.g., Asylum Seeker, Refugee, Undocumented

    @Column(name = "accommodation_type")
    private String accommodationType; // e.g., Shelter, Rented, Homeless

    @Column(name = "assigned_volunteer_id", nullable = false)
    private UUID assignedVolunteerId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
