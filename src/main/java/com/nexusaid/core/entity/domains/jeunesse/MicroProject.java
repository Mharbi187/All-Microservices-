package com.nexusaid.core.entity.domains.jeunesse;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "micro_projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MicroProject {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String theme; // e.g., Climate, Citizenship

    @Column(length = 1000)
    private String description;

    @Column(name = "lead_volunteer_id", nullable = false)
    private UUID leadVolunteerId;

    @Column(name = "committee_id")
    private UUID committeeId;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<UUID> participants;

    @Column(nullable = false)
    private String status; // PENDING_VALIDATION, APPROVED, REJECTED, ACTIVE, COMPLETED

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> results;
}
