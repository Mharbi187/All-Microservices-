package com.nexusaid.core.entity.domains.catastrophe;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.Committee;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Mission d'intervention catastrophe (NDRT/RDRT).
 * Gérée par le RESP_CATASTROPHES national ou régional.
 */
@Entity
@Table(name = "disaster_missions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisasterMission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee committee;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "mission_type", nullable = false)
    private String missionType; // SECOURS, EVACUATION, LOGISTIQUE, MEDICAL, SURVEILLANCE

    @Column(nullable = false)
    @Builder.Default
    private String status = "PLANNED"; // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED

    @Column(name = "start_datetime", nullable = false)
    private LocalDateTime startDatetime;

    @Column(name = "end_datetime")
    private LocalDateTime endDatetime;

    // GPS location as JSON {lat, lng, address}
    @Type(JsonBinaryType.class)
    @Column(name = "location_gps", columnDefinition = "jsonb")
    private Map<String, Object> locationGps;

    // Team chief (volunteer id + name stored for easy display)
    @Column(name = "team_chief_id")
    private UUID teamChiefId;

    @Column(name = "team_chief_name", length = 200)
    private String teamChiefName;

    // Assigned volunteers [{volunteerId, fullName, teamType, matricule, committeeId}]
    @Type(JsonBinaryType.class)
    @Column(name = "assigned_volunteers", columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> assignedVolunteers = List.of();

    // Required materials list
    @Type(JsonBinaryType.class)
    @Column(name = "required_materials", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> requiredMaterials = List.of();

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "notification_sent")
    @Builder.Default
    private Boolean notificationSent = false;

    // Report template UUID assigned to this mission
    @Column(name = "report_template_id")
    private UUID reportTemplateId;

    @Column(name = "report_deadline")
    private LocalDateTime reportDeadline;

    @Column(name = "report_assigned_at")
    private LocalDateTime reportAssignedAt;

    @Column(name = "report_reminder_sent")
    @Builder.Default
    private Boolean reportReminderSent = false;

    // Mission order number (auto-generated)
    @Column(name = "mission_number", unique = true)
    private String missionNumber;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) this.status = "PLANNED";
        if (this.missionNumber == null) {
            this.missionNumber = "MISS-" + System.currentTimeMillis();
        }
    }
}
