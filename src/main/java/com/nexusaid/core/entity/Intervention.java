package com.nexusaid.core.entity;

import com.nexusaid.core.entity.enums.InterventionStatus;
import com.nexusaid.core.entity.enums.InterventionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interventions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Intervention {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "interventions", "volunteers", "hibernateLazyInitializer",
            "handler" })
    private Committee committee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterventionType interventionType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String locationGps; // JSON string for coordinates

    @Column(nullable = false)
    private LocalDateTime startDatetime;

    private LocalDateTime endDatetime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_id")
    private Volunteer responsible;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InterventionStatus status = InterventionStatus.PLANNED;

    @Builder.Default
    private Integer participantsCount = 0;

    @Builder.Default
    private Integer beneficiariesCount = 0;

    @Column(columnDefinition = "TEXT")
    private String materialsUsed; // JSON

    @Column(columnDefinition = "TEXT")
    private String reportContent; // JSON structured report

    @OneToMany(mappedBy = "intervention", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InterventionParticipant> participants = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
