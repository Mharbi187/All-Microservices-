package com.nexusaid.core.entity.domains.vff;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "protection_campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProtectionCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(name = "target_audience")
    private String targetAudience;

    private String topic;

    private String location;

    private LocalDate date;

    @Column(name = "participants_count")
    private int participantsCount;

    @Type(JsonBinaryType.class)
    @Column(name = "materials_used", columnDefinition = "jsonb")
    private List<String> materialsUsed;
}
