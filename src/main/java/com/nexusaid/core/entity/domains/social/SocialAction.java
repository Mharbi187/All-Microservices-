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
@Table(name = "social_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialAction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "action_type", nullable = false)
    private String actionType; // FOOD_DELIVERY, MEDICAL_AID, FINANCIAL

    @Column(name = "event_context")
    private String eventContext; // e.g., Ramadan 2026, Winter Rescue

    @Type(JsonBinaryType.class)
    @Column(name = "aid_provided", columnDefinition = "jsonb")
    private Map<String, Object> aidProvided;

    private Integer quantity;

    @Column(length = 300)
    private String title;

    @Column(length = 100)
    private String priority; // URGENCE, HAUTE, NORMALE, FAIBLE

    @Column(length = 500)
    private String location;

    @Column(name = "action_chief_name", length = 200)
    private String actionChiefName;

    @Column(name = "volunteers_needed")
    private Boolean volunteersNeeded;

    @Column(name = "volunteers_count")
    private Integer volunteersCount;

    @Type(JsonBinaryType.class)
    @Column(name = "files_urls", columnDefinition = "jsonb")
    private List<String> filesUrls;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "performed_at")
    private LocalDateTime performedAt;

    @Type(JsonBinaryType.class)
    @Column(name = "photos_urls", columnDefinition = "jsonb")
    private List<String> photosUrls;

    @Column(length = 1000)
    private String notes;

    @PrePersist
    protected void onCreate() {
        performedAt = LocalDateTime.now();
        if (this.actionType == null)
            this.actionType = "UNKNOWN";
        if (this.performedBy == null)
            this.performedBy = UUID.randomUUID();
    }
}
