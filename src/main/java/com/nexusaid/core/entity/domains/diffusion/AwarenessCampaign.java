package com.nexusaid.core.entity.domains.diffusion;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "awareness_campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AwarenessCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(name = "target_principle")
    private String targetPrinciple;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> channels; // e.g., Facebook, Instagram, Schools

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "reach_count")
    private int reachCount;

    @Type(JsonBinaryType.class)
    @Column(name = "engagement_metrics", columnDefinition = "jsonb")
    private Map<String, Integer> engagementMetrics;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy; // refers to the RESP_DIFFUSION volunteer ID

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "location")
    private String location;

    @Column(name = "volunteers_needed")
    private Integer volunteersNeeded;

    @Column(name = "collaboration_type")
    private String collaborationType; // e.g. "INTERNAL" or "COLLABORATION"
}
