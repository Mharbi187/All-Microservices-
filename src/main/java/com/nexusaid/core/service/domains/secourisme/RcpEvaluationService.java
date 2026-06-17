package com.nexusaid.core.service.domains.secourisme;

import com.nexusaid.core.dto.RcpEvaluationDto;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.domains.secourisme.RcpEvaluation;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.domains.secourisme.RcpEvaluationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nexusaid.core.service.EmailService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RcpEvaluationService {

    private final RcpEvaluationRepository evaluationRepository;
    private final CommitteeRepository committeeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public RcpEvaluationDto create(RcpEvaluationDto dto, UUID trainerId) {
        Committee committee = committeeRepository.findById(dto.getCommitteeId())
                .orElseThrow(() -> new IllegalArgumentException("Committee not found: " + dto.getCommitteeId()));

        User trainer = userRepository.findById(trainerId).orElse(null);

        RcpEvaluation eval = RcpEvaluation.builder()
                .committee(committee)
                .trainer(trainer)
                .trainerName(dto.getTrainerName())
                .trainerCenter(dto.getTrainerCenter())
                .aiVersion(dto.getAiVersion())
                .evaluationDate(dto.getEvaluationDate() != null ? dto.getEvaluationDate() : LocalDate.now())
                .evaluationTime(parseTime(dto.getEvaluationTime()))
                .participantName(dto.getParticipantName())
                .participantEmail(dto.getParticipantEmail())
                .participantLevel(dto.getParticipantLevel())
                .totalAttempts(dto.getTotalAttempts())
                .photoParticipant(dto.getPhotoParticipant())
                .photoCardiacPosition(dto.getPhotoCardiacPosition())
                .photoAiScreenshot(dto.getPhotoAiScreenshot())
                .videoTestUrl(dto.getVideoTestUrl())
                .scores(dto.getScores())
                .comments(dto.getComments())
                .problemsEncountered(dto.getProblemsEncountered())
                .problemDescription(dto.getProblemDescription())
                .scoreIa(dto.getScoreIa())
                .scoreTrainer(dto.getScoreTrainer())
                .concordanceLevel(dto.getConcordanceLevel())
                .concordanceGap(dto.getConcordanceGap())
                .recommendations(dto.getRecommendations())
                .trainerDecision(dto.getTrainerDecision())
                .trainerFinalComments(dto.getTrainerFinalComments())
                .trainerSignature(dto.getTrainerSignature())
                .build();

        RcpEvaluation saved = evaluationRepository.save(eval);

        // Send confirmation and thank you email if email is provided
        if (saved.getParticipantEmail() != null && !saved.getParticipantEmail().isBlank()) {
            emailService.sendRcpEvaluationThankYouEmail(
                    saved.getParticipantEmail(),
                    saved.getParticipantName(),
                    saved.getTrainerName(),
                    saved.getTrainerDecision(),
                    saved.getScoreIa(),
                    saved.getScoreTrainer()
            );
        }

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<RcpEvaluationDto> getByTrainer(UUID trainerId) {
        return evaluationRepository.findByTrainerIdOrderByCreatedAtDesc(trainerId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RcpEvaluationDto> getByCommittee(UUID committeeId) {
        return evaluationRepository.findByCommitteeIdOrderByCreatedAtDesc(committeeId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RcpEvaluationDto> getAllNational() {
        return evaluationRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(RcpEvaluation::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getNationalStatistics() {
        List<RcpEvaluation> all = evaluationRepository.findAll();

        long total = all.size();
        double avgScoreIa = all.stream()
                .filter(e -> e.getScoreIa() != null)
                .mapToDouble(e -> e.getScoreIa().doubleValue())
                .average().orElse(0.0);
        double avgScoreTrainer = all.stream()
                .filter(e -> e.getScoreTrainer() != null)
                .mapToDouble(e -> e.getScoreTrainer().doubleValue())
                .average().orElse(0.0);

        // Count by concordance level
        Map<String, Long> byConcordance = all.stream()
                .filter(e -> e.getConcordanceLevel() != null)
                .collect(Collectors.groupingBy(RcpEvaluation::getConcordanceLevel, Collectors.counting()));

        // Count by decision
        Map<String, Long> byDecision = all.stream()
                .filter(e -> e.getTrainerDecision() != null)
                .collect(Collectors.groupingBy(RcpEvaluation::getTrainerDecision, Collectors.counting()));

        // Count by committee
        Map<String, Long> byCommittee = all.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getCommittee().getName(),
                        Collectors.counting()
                ));

        // Average scores by committee
        Map<String, Double> avgIaByCommittee = all.stream()
                .filter(e -> e.getScoreIa() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getCommittee().getName(),
                        Collectors.averagingDouble(e -> e.getScoreIa().doubleValue())
                ));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEvaluations", total);
        stats.put("avgScoreIa", Math.round(avgScoreIa * 10.0) / 10.0);
        stats.put("avgScoreTrainer", Math.round(avgScoreTrainer * 10.0) / 10.0);
        stats.put("byConcordance", byConcordance);
        stats.put("byDecision", byDecision);
        stats.put("byCommittee", byCommittee);
        stats.put("avgIaByCommittee", avgIaByCommittee);
        return stats;
    }

    // ---- Mapper ----

    private RcpEvaluationDto toDto(RcpEvaluation e) {
        return RcpEvaluationDto.builder()
                .id(e.getId())
                .committeeId(e.getCommittee() != null ? e.getCommittee().getId() : null)
                .committeeName(e.getCommittee() != null ? e.getCommittee().getName() : null)
                .trainerId(e.getTrainer() != null ? e.getTrainer().getId() : null)
                .trainerName(e.getTrainerName())
                .trainerCenter(e.getTrainerCenter())
                .aiVersion(e.getAiVersion())
                .evaluationDate(e.getEvaluationDate())
                .evaluationTime(e.getEvaluationTime() != null ? e.getEvaluationTime().format(DateTimeFormatter.ofPattern("HH:mm")) : null)
                .participantName(e.getParticipantName())
                .participantEmail(e.getParticipantEmail())
                .participantLevel(e.getParticipantLevel())
                .totalAttempts(e.getTotalAttempts())
                .photoParticipant(e.getPhotoParticipant())
                .photoCardiacPosition(e.getPhotoCardiacPosition())
                .photoAiScreenshot(e.getPhotoAiScreenshot())
                .videoTestUrl(e.getVideoTestUrl())
                .scores(e.getScores())
                .comments(e.getComments())
                .problemsEncountered(e.getProblemsEncountered())
                .problemDescription(e.getProblemDescription())
                .scoreIa(e.getScoreIa())
                .scoreTrainer(e.getScoreTrainer())
                .concordanceLevel(e.getConcordanceLevel())
                .concordanceGap(e.getConcordanceGap())
                .recommendations(e.getRecommendations())
                .trainerDecision(e.getTrainerDecision())
                .trainerFinalComments(e.getTrainerFinalComments())
                .trainerSignature(e.getTrainerSignature())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) return null;
        try {
            return LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception ex) {
            return null;
        }
    }
}
