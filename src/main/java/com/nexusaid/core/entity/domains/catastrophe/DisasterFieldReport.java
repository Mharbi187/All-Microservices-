package com.nexusaid.core.entity.domains.catastrophe;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Rapport de terrain rempli par un volontaire suite à une mission.
 */
@Entity
@Table(name = "disaster_field_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisasterFieldReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private DisasterMission mission;

    @Column(name = "volunteer_id", nullable = false)
    private UUID volunteerId;

    @Column(name = "volunteer_name", length = 200)
    private String volunteerName;

    @Column(name = "template_id")
    private UUID templateId;

    // Dynamic form responses as JSON
    @Type(JsonBinaryType.class)
    @Column(name = "responses", columnDefinition = "jsonb")
    private Map<String, Object> responses;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUBMITTED, VALIDATED

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(columnDefinition = "TEXT")
    private String validatorNotes;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
