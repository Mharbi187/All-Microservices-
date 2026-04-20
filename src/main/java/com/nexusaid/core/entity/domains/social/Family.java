package com.nexusaid.core.entity.domains.social;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "families")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Family {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "family_name", nullable = false)
    private String familyName;

    @Column(name = "head_of_family", nullable = false)
    private String headOfFamily;

    private int members;

    @Column(length = 500)
    private String address;

    @Type(JsonBinaryType.class)
    @Column(name = "gps_coordinates", columnDefinition = "jsonb")
    private Map<String, Double> gpsCoordinates;

    @Type(JsonBinaryType.class)
    @Column(name = "needs_type", columnDefinition = "jsonb")
    private List<String> needsType; // e.g., MEDICAL, FOOD, SHELTER

    @Type(JsonBinaryType.class)
    @Column(name = "urgent_needs", columnDefinition = "jsonb")
    private List<String> urgentNeeds;

    @Type(JsonBinaryType.class)
    @Column(name = "event_tags", columnDefinition = "jsonb")
    private List<String> eventTags; // e.g., Ramadan, Rentrée Scolaire

    @Column(name = "registered_at")
    private LocalDateTime registeredAt;

    @Column(name = "last_visit_date")
    private LocalDateTime lastVisitDate;

    @Column(nullable = false)
    private String status; // ACTIVE, SUPPORTED, ARCHIVED

    @PrePersist
    protected void onCreate() {
        registeredAt = LocalDateTime.now();
    }
}
