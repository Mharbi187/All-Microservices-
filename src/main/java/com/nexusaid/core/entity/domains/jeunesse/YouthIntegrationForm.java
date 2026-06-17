package com.nexusaid.core.entity.domains.jeunesse;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "youth_integration_forms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YouthIntegrationForm {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "volunteer_id", nullable = false)
    private UUID volunteerId;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> aspirations;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> skills;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> aptitudes;

    @Type(JsonBinaryType.class)
    @Column(name = "interest_areas", columnDefinition = "jsonb")
    private List<String> interestAreas;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Transient
    private String volunteerName;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}
