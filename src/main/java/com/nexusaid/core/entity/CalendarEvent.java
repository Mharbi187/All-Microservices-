package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.GenericGenerator;
import com.nexusaid.core.entity.enums.CommitteeType;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "calendar_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEvent {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String type; // 'FORMATION', 'EVENT', 'URGENCE', 'REUNION', 'COLLECTE'

    @Column(nullable = false)
    private OffsetDateTime startDate;

    @Column(nullable = false)
    private OffsetDateTime endDate;

    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    private User organizer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id")
    private Committee committee;

    private Integer maxParticipants;

    /**
     * Portée hiérarchique de l'événement (enum CommitteeType) :
     * LOCAL    → visible uniquement par le comité organisateur
     * REGIONAL → visible par tous les comités locaux du gouvernorat
     * NATIONAL → visible par tous
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_scope", nullable = false)
    @Builder.Default
    private CommitteeType targetScope = CommitteeType.LOCAL;

    /**
     * Statut de validation :
     * EN_ATTENTE → soumis, attend validation
     * VALIDE     → validé et visible au calendrier
     * REJETE     → refusé
     * ANNULE     → annulé
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "EN_ATTENTE";

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "event_registrations",
        joinColumns = @JoinColumn(name = "event_id"),
        inverseJoinColumns = @JoinColumn(name = "volunteer_id")
    )
    @Builder.Default
    @EqualsAndHashCode.Exclude
    private Set<Volunteer> participants = new HashSet<>();
}
