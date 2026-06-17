package com.nexusaid.core.service.domains.social;

import com.nexusaid.core.entity.domains.social.Family;
import com.nexusaid.core.entity.domains.social.SocialAction;
import com.nexusaid.core.entity.domains.social.VulnerabilityScore;
import com.nexusaid.core.repository.domains.social.FamilyRepository;
import com.nexusaid.core.repository.domains.social.SocialActionRepository;
import com.nexusaid.core.repository.domains.social.VulnerabilityScoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SocialService {

    private final FamilyRepository familyRepository;
    private final VulnerabilityScoreRepository scoreRepository;
    private final SocialActionRepository actionRepository;
    private final VulnerabilityScoringEngine scoringEngine;
    private final com.nexusaid.core.repository.CommitteeRoleRepository roleRepository;

    private boolean isPresident(UUID userId) {
        return roleRepository.findByVolunteerId(userId).stream()
                .anyMatch(r -> r.getStatus() == com.nexusaid.core.entity.enums.CommitteeRoleStatus.APPROVED 
                        && r.getTitle() == com.nexusaid.core.entity.enums.RoleTitle.PRESIDENT);
    }

    // ===== Families =====

    @Transactional
    public Family registerFamily(Family family, UUID creatorId) {
        if (isPresident(creatorId)) {
            family.setStatus("ACTIVE");
        } else {
            family.setStatus("PENDING");
        }
        return familyRepository.save(family);
    }

    @Transactional(readOnly = true)
    public List<Family> getAllFamilies() {
        return familyRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Family> getFamilyById(UUID familyId) {
        return familyRepository.findById(familyId);
    }

    @Transactional
    public Family updateFamily(UUID familyId, Family updated) {
        return familyRepository.findById(familyId).map(existing -> {
            existing.setFamilyName(updated.getFamilyName());
            existing.setHeadOfFamily(updated.getHeadOfFamily());
            existing.setMembers(updated.getMembers());
            existing.setAddress(updated.getAddress() == null || updated.getAddress().trim().isEmpty() ? "Indéfini" : updated.getAddress());
            existing.setCin(updated.getCin());
            existing.setRecipientName(updated.getRecipientName());
            existing.setImageUrl(updated.getImageUrl());
            existing.setGpsCoordinates(updated.getGpsCoordinates());
            existing.setNeedsType(updated.getNeedsType());
            existing.setUrgentNeeds(updated.getUrgentNeeds());
            existing.setEventTags(updated.getEventTags());
            existing.setStatus(updated.getStatus());
            return familyRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Family not found: " + familyId));
    }

    // ===== Vulnerability Scores (with AI Engine) =====

    @Transactional
    public VulnerabilityScore calculateAndSaveScore(UUID familyId, VulnerabilityScore scoreInput) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new RuntimeException("Family not found: " + familyId));

        Optional<VulnerabilityScore> previousScore = scoreRepository.findTopByFamilyIdOrderByCalculatedAtDesc(familyId);

        // Use the scoring engine if factors are provided, otherwise save raw
        if (scoreInput.getFactors() != null && !scoreInput.getFactors().isEmpty()) {
            VulnerabilityScore computed = scoringEngine.calculate(family, scoreInput.getFactors(), previousScore);
            return scoreRepository.save(computed);
        }

        // Fallback: manual score entry
        scoreInput.setFamilyId(familyId);
        if (scoreInput.getTrend() == null)
            scoreInput.setTrend("STABLE");
        return scoreRepository.save(scoreInput);
    }

    @Transactional(readOnly = true)
    public Optional<VulnerabilityScore> getLatestScoreForFamily(UUID familyId) {
        return scoreRepository.findTopByFamilyIdOrderByCalculatedAtDesc(familyId);
    }

    @Transactional(readOnly = true)
    public List<VulnerabilityScore> getScoreHistory(UUID familyId) {
        return scoreRepository.findByFamilyId(familyId);
    }

    // ===== Social Actions =====

    @Transactional
    public SocialAction performAction(SocialAction action, UUID performedBy) {
        action.setPerformedBy(performedBy);

        // Update family's last visit date
        familyRepository.findById(action.getFamilyId()).ifPresent(family -> {
            family.setLastVisitDate(LocalDateTime.now());
            familyRepository.save(family);
        });

        return actionRepository.save(action);
    }

    @Transactional(readOnly = true)
    public List<SocialAction> getActionsForFamily(UUID familyId) {
        return actionRepository.findByFamilyId(familyId);
    }

    @Transactional(readOnly = true)
    public List<SocialAction> getAllActions() {
        return actionRepository.findAll();
    }

    // ===== Analytics =====

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new LinkedHashMap<>();

        List<Family> allFamilies = familyRepository.findAll();
        List<SocialAction> allActions = actionRepository.findAll();

        // KPI counts
        analytics.put("totalFamilies", allFamilies.size());
        analytics.put("totalMembers", allFamilies.stream().mapToInt(Family::getMembers).sum());
        analytics.put("activeFamilies", allFamilies.stream().filter(f -> "ACTIVE".equals(f.getStatus())).count());
        analytics.put("totalActions", allActions.size());

        // Families by status
        Map<String, Long> byStatus = allFamilies.stream()
                .collect(Collectors.groupingBy(Family::getStatus, Collectors.counting()));
        analytics.put("familiesByStatus", byStatus);

        // Actions by type
        Map<String, Long> byActionType = allActions.stream()
                .filter(a -> a.getActionType() != null)
                .collect(Collectors.groupingBy(SocialAction::getActionType, Collectors.counting()));
        analytics.put("actionsByType", byActionType);

        // Needs distribution
        Map<String, Long> needsDist = allFamilies.stream()
                .filter(f -> f.getNeedsType() != null)
                .flatMap(f -> f.getNeedsType().stream())
                .collect(Collectors.groupingBy(n -> n, Collectors.counting()));
        analytics.put("needsDistribution", needsDist);

        // Urgent cases count
        long urgentCount = allFamilies.stream()
                .filter(f -> f.getUrgentNeeds() != null && !f.getUrgentNeeds().isEmpty())
                .count();
        analytics.put("urgentCases", urgentCount);

        // Event tag distribution (Ramadan, Rentrée, etc.)
        Map<String, Long> eventDist = allFamilies.stream()
                .filter(f -> f.getEventTags() != null)
                .flatMap(f -> f.getEventTags().stream())
                .collect(Collectors.groupingBy(e -> e, Collectors.counting()));
        analytics.put("eventTagDistribution", eventDist);

        // Vulnerability score distribution (bands)
        List<VulnerabilityScore> latestScores = new ArrayList<>();
        for (Family family : allFamilies) {
            scoreRepository.findTopByFamilyIdOrderByCalculatedAtDesc(family.getId())
                    .ifPresent(latestScores::add);
        }
        Map<String, Long> scoreBands = new LinkedHashMap<>();
        scoreBands.put("critical", latestScores.stream().filter(s -> s.getScore() >= 76).count());
        scoreBands.put("high", latestScores.stream().filter(s -> s.getScore() >= 51 && s.getScore() < 76).count());
        scoreBands.put("moderate", latestScores.stream().filter(s -> s.getScore() >= 26 && s.getScore() < 51).count());
        scoreBands.put("low", latestScores.stream().filter(s -> s.getScore() < 26).count());
        analytics.put("vulnerabilityBands", scoreBands);

        // Trend overview
        Map<String, Long> trends = latestScores.stream()
                .collect(Collectors.groupingBy(VulnerabilityScore::getTrend, Collectors.counting()));
        analytics.put("trendOverview", trends);

        // Priority families (top 10 most vulnerable)
        List<Map<String, Object>> priorityFamilies = latestScores.stream()
                .sorted(VulnerabilityScoringEngine::compareByPriority)
                .limit(10)
                .map(score -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("familyId", score.getFamilyId());
                    entry.put("score", score.getScore());
                    entry.put("trend", score.getTrend());
                    familyRepository.findById(score.getFamilyId()).ifPresent(f -> {
                        entry.put("familyName", f.getFamilyName());
                        entry.put("members", f.getMembers());
                    });
                    return entry;
                })
                .collect(Collectors.toList());
        analytics.put("priorityFamilies", priorityFamilies);

        return analytics;
    }
}
