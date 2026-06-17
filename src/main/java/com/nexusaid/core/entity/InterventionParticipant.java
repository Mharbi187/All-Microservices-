package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "intervention_participants", uniqueConstraints = @UniqueConstraint(columnNames = { "intervention_id",
        "volunteer_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterventionParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "intervention_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Intervention intervention;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "volunteer_id", nullable = false)
    private Volunteer volunteer;

    @Column(nullable = false)
    private String role; // SECOURISTE, ASSISTANT, COORDINATEUR

    @Builder.Default
    private BigDecimal hoursContributed = BigDecimal.ZERO;

    @Builder.Default
    private Boolean attended = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
