package com.nexusaid.core.entity.domains.secourisme;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "rcp_evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RcpEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee committee;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainer_id")
    private User trainer;

    @Column(name = "trainer_name", nullable = false)
    private String trainerName;

    @Column(name = "trainer_center")
    private String trainerCenter;

    @Column(name = "ai_version")
    private String aiVersion;

    @Column(name = "evaluation_date")
    private LocalDate evaluationDate;

    @Column(name = "evaluation_time")
    private LocalTime evaluationTime;

    @Column(name = "participant_name")
    private String participantName;
    
    @Column(name = "participant_email")
    private String participantEmail;

    @Column(name = "participant_level")
    private String participantLevel;

    @Column(name = "total_attempts")
    private Integer totalAttempts;

    // Photos stored as base64 strings
    @Column(name = "photo_participant", columnDefinition = "text")
    private String photoParticipant;

    @Column(name = "photo_cardiac_position", columnDefinition = "text")
    private String photoCardiacPosition;

    @Column(name = "photo_ai_screenshot", columnDefinition = "text")
    private String photoAiScreenshot;

    @Column(name = "video_test_url")
    private String videoTestUrl;

    // Scores JSONB: {"handPosition": 4, "depth": 3, ...}
    @Type(JsonBinaryType.class)
    @Column(name = "scores", columnDefinition = "jsonb")
    private Map<String, Object> scores;

    // Comments JSONB: {"handPosition": "...", "depth": "..."}
    @Type(JsonBinaryType.class)
    @Column(name = "comments", columnDefinition = "jsonb")
    private Map<String, Object> comments;

    // Problems JSONB: ["fausses_alertes", "detection_retard"]
    @Type(JsonBinaryType.class)
    @Column(name = "problems_encountered", columnDefinition = "jsonb")
    private List<String> problemsEncountered;

    @Column(name = "problem_description", columnDefinition = "text")
    private String problemDescription;

    @Column(name = "score_ia", precision = 4, scale = 1)
    private BigDecimal scoreIa;

    @Column(name = "score_trainer", precision = 4, scale = 1)
    private BigDecimal scoreTrainer;

    @Column(name = "concordance_level")
    private String concordanceLevel;

    @Column(name = "concordance_gap", precision = 4, scale = 1)
    private BigDecimal concordanceGap;

    // Recommendations JSONB: {"high": [...], "medium": [...], "low": [...]}
    @Type(JsonBinaryType.class)
    @Column(name = "recommendations", columnDefinition = "jsonb")
    private Map<String, Object> recommendations;

    @Column(name = "trainer_decision")
    private String trainerDecision;

    @Column(name = "trainer_final_comments", columnDefinition = "text")
    private String trainerFinalComments;

    @Column(name = "trainer_signature", columnDefinition = "text")
    private String trainerSignature;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
