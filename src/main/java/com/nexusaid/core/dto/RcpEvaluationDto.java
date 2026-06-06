package com.nexusaid.core.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for RCP (Réanimation Cardio-Pulmonaire) AI evaluation form.
 * Filled exclusively by RESP_SECOURISME trainers / RCP-certified trainers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RcpEvaluationDto {

    private UUID id;
    private UUID committeeId;
    private String committeeName;
    private UUID trainerId;
    private String trainerName;
    private String trainerCenter;
    private String aiVersion;
    private LocalDate evaluationDate;
    private String evaluationTime;      // "HH:mm"
    private String participantName;
    private String participantEmail;
    private String participantLevel;    // DEBUTANT, INTERMEDIAIRE, AVANCE, PROFESSIONNEL
    private Integer totalAttempts;

    // Photos (base64 strings)
    private String photoParticipant;
    private String photoCardiacPosition;
    private String photoAiScreenshot;
    private String videoTestUrl;

    // Scores per criterion (key = criterionKey, value = 1-5 score)
    private Map<String, Object> scores;

    // Comments per criterion
    private Map<String, Object> comments;

    // Problems encountered
    private List<String> problemsEncountered;
    private String problemDescription;

    // Results
    private BigDecimal scoreIa;
    private BigDecimal scoreTrainer;
    private String concordanceLevel;    // EXCELLENT, BON, MOYEN, FAIBLE
    private BigDecimal concordanceGap;

    // Recommendations
    private Map<String, Object> recommendations;

    // Trainer decision
    private String trainerDecision;     // PRET, AMELIORATIONS_MINEURES, AMELIORATIONS_MAJEURES, NON_RECOMMANDE
    private String trainerFinalComments;
    private String trainerSignature;

    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Statistics (for national dashboard only — computed, not persisted)
    private Double avgScoreIa;
    private Double avgScoreTrainer;
    private Long totalEvaluations;
}
