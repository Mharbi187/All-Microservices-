package com.nexusaid.core.entity.domains.sante;

import com.nexusaid.core.entity.Committee;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "health_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthAction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee committee;

    @Column(name = "challenge_id")
    private UUID challengeId; // Nullable, if this is part of a national challenge

    @Column(nullable = false)
    private String title;

    @Column(name = "action_type", nullable = false)
    private String actionType; // e.g., Vaccination, Checkup, Distribution

    @Column(length = 1000)
    private String description;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private String location; // JSON storing GPS or address info

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "chief_id")
    private UUID chiefId; // The ActionChief in charge

    @Column(nullable = false)
    private String status; // PLANNED, ONGOING, COMPLETED

    @Column(name = "beneficiaries_count")
    private int beneficiariesCount;

    @Type(JsonBinaryType.class)
    @Column(name = "photos_urls", columnDefinition = "jsonb")
    private List<String> photosUrls;
}
