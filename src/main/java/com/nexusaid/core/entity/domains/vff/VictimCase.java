package com.nexusaid.core.entity.domains.vff;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "victim_cases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VictimCase {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "case_reference", unique = true, nullable = false)
    private String caseReference; // Anonymized reference ID

    @Column(name = "victim_age")
    private int victimAge;

    @Column(name = "victim_gender")
    private String victimGender;

    @Column(name = "victim_type")
    private String victimType; // Child, Woman, Elderly

    @Column(name = "incident_type")
    private String incidentType; // Physical, Psychological, Economic

    @Column(name = "incident_date")
    private LocalDate incidentDate;

    @Column(name = "risk_level")
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "is_confidential")
    private boolean isConfidential;

    @Column(name = "access_restricted")
    private boolean accessRestricted; // Only specific RESP_VFF can view

    @Column(name = "encryption_key")
    private String encryptionKey; // For future end-to-end encryption of sensitive details

    @Column(name = "assigned_volunteer_id")
    private UUID assignedVolunteerId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
