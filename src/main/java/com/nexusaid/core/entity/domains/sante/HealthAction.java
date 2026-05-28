package com.nexusaid.core.entity.domains.sante;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee committee;

    @Column(name = "challenge_id")
    private UUID challengeId; // Nullable, if this is part of a national challenge

    @Column(nullable = false)
    private String title;

    @Column(name = "action_type", nullable = false)
    private String actionType; // e.g., Vaccination, Checkup, Distribution

    @Column(length = 2000)
    private String description;

    @Column(length = 2000)
    private String location; // Storing as simple String since frontend passes simple texts

    // --- Localisation enrichie ---
    @Column(length = 500)
    private String address;

    @Type(JsonBinaryType.class)
    @Column(name = "gps_coordinates", columnDefinition = "jsonb")
    private java.util.Map<String, Double> gpsCoordinates;

    // --- Planification ---
    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // --- Priorité & Catégorie ---
    @Column(length = 50)
    private String priority; // URGENCE, HAUTE, NORMALE, FAIBLE

    @Column(length = 100)
    private String category; // CARAVANE_MEDICALE, CONSULTATION, DISTRIBUTION, etc.

    @Column(nullable = false)
    private String status; // PLANNED, ONGOING, COMPLETED

    @Column(name = "beneficiaries_count")
    private int beneficiariesCount;

    // --- Volontaires ---
    @Column(name = "volunteers_needed")
    private boolean volunteersNeeded;

    @Column(name = "volunteers_count")
    private int volunteersCount;

    @Column(name = "collaboration_type", length = 50)
    private String collaborationType; // INTERNAL, EXTERNAL

    // --- Chef d'action ---
    @Column(name = "action_chief_name", length = 200)
    private String actionChiefName;

    @Column(name = "action_chief_photo_url", columnDefinition = "TEXT")
    private String actionChiefPhotoUrl;

    @Column(name = "action_chief_id")
    private UUID actionChiefId;

    // --- Hôpital / Bénéficiaire ---
    @Column(name = "hospital_destination", length = 300)
    private String hospitalDestination;

    // --- Médias & Documents ---
    @Type(JsonBinaryType.class)
    @Column(name = "photos_urls", columnDefinition = "jsonb")
    private List<String> photosUrls;

    @Type(JsonBinaryType.class)
    @Column(name = "files_urls", columnDefinition = "jsonb")
    private List<String> filesUrls; // PDF, Word, Excel, etc.

    // --- Participants ---
    @Type(JsonBinaryType.class)
    @Column(name = "volunteers_list", columnDefinition = "jsonb")
    private List<java.util.Map<String, String>> volunteersList; // [{id, name, committeeId}]

    // --- Traçabilité ---
    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "chief_id")
    private UUID chiefId; // The ActionChief in charge (legacy)

    @PrePersist
    protected void onCreate() {
        if (this.actionType == null)
            this.actionType = "UNKNOWN";
        if (this.title == null)
            this.title = "Action Santé";
        if (this.status == null)
            this.status = "PLANNED";
        if (this.priority == null)
            this.priority = "NORMALE";
    }
}
