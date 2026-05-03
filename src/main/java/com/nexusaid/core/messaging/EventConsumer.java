package com.nexusaid.core.messaging;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.Intervention;
import com.nexusaid.core.entity.enums.InterventionStatus;
import com.nexusaid.core.entity.enums.InterventionType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.InterventionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Consumes events from RabbitMQ for the Core Service.
 * Implements real inter-service communication from MS4 to MS1.
 *
 * FIXES APPLIED:
 * - H1: Idempotency via deduplication window (region + disasterType within 30
 * min)
 * - H2: Region-based committee lookup instead of committees.get(0)
 * - H6: Schema validation — required fields checked before processing
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventConsumer {

        private final InterventionRepository interventionRepository;
        private final CommitteeRepository committeeRepository;

        /**
         * H1 FIX: Deduplication window.
         * Tracks recently processed disaster alerts to prevent duplicate interventions.
         * Key: "disasterType|region", Value: timestamp of last processing.
         * Window: 30 minutes (same disaster type + region = duplicate).
         */
        private final ConcurrentHashMap<String, LocalDateTime> recentAlerts = new ConcurrentHashMap<>();
        private static final int DEDUP_WINDOW_MINUTES = 30;

        /**
         * H6 FIX: Required fields for a valid disaster alert event.
         */
        private static final Set<String> REQUIRED_FIELDS = Set.of("disasterType", "region", "severity");

        /**
         * When MS4 (Disaster Detection) detects a crisis via GEE, it publishes to this
         * queue. This consumer auto-creates an actionable Intervention in the
         * volunteering module.
         *
         * BEFORE (vulnerabilities):
         * - No dedup: 50 identical alerts = 50 duplicate interventions (H1)
         * - committees.get(0): wrong team always assigned (H2)
         * - No validation: malformed event could crash consumer (H6)
         *
         * AFTER (hardened):
         * - Dedup window prevents duplicate interventions within 30 min (H1)
         * - Region-based committee lookup via name/region matching (H2)
         * - Required fields validated before processing (H6)
         */
        @RabbitListener(queues = "nexusaid.disaster.alerts")
        public void handleDisasterAlert(Map<String, Object> event) {
                // ── H6: Schema validation ────────────────────────────
                for (String field : REQUIRED_FIELDS) {
                        if (!event.containsKey(field) || event.get(field) == null) {
                                log.warn("[CORE] Rejecting malformed disaster alert — missing field '{}': {}",
                                                field, event);
                                return;
                        }
                }

                String disasterType = String.valueOf(event.get("disasterType"));
                String region = String.valueOf(event.get("region"));
                String severity = String.valueOf(event.get("severity"));
                Object riskScoreObj = event.getOrDefault("riskScore", 0.0);
                double riskScore = riskScoreObj instanceof Number ? ((Number) riskScoreObj).doubleValue() : 0.0;

                log.info("[CORE] Disaster alert received from MS4: type={}, region={}, severity={}, risk={}",
                                disasterType, region, severity, riskScore);

                // ── H1: Idempotency check ───────────────────────────
                String dedupKey = disasterType + "|" + region;
                LocalDateTime lastProcessed = recentAlerts.get(dedupKey);
                LocalDateTime now = LocalDateTime.now();

                if (lastProcessed != null && lastProcessed.plusMinutes(DEDUP_WINDOW_MINUTES).isAfter(now)) {
                        log.info("[CORE] Duplicate disaster alert suppressed (within {}min window): {} in {}",
                                        DEDUP_WINDOW_MINUTES, disasterType, region);
                        return;
                }
                recentAlerts.put(dedupKey, now);

                // Cleanup old entries periodically (simple eviction)
                recentAlerts.entrySet().removeIf(
                                e -> e.getValue().plusMinutes(DEDUP_WINDOW_MINUTES * 2L).isBefore(now));

                // ── H2: Region-based committee lookup ───────────────
                Committee targetCommittee = findCommitteeByRegion(region);
                if (targetCommittee == null) {
                        log.warn("[CORE] Cannot create Intervention: no committee found for region '{}'. "
                                        + "Attempting fallback to any available committee.", region);
                        List<Committee> allCommittees = committeeRepository.findAll();
                        if (allCommittees.isEmpty()) {
                                log.error("[CORE] CRITICAL: No committees exist in DB. Disaster alert for {} in {} "
                                                + "cannot be actioned. Manual intervention required.", disasterType,
                                                region);
                                return;
                        }
                        targetCommittee = allCommittees.get(0);
                        log.warn("[CORE] Fallback: assigning intervention to committee '{}' (id={})",
                                        targetCommittee.getName(), targetCommittee.getId());
                }

                String description = String.format(
                                "Auto-generated emergency intervention triggered by the AI Command Center.\n"
                                                + "Region: %s\nDisaster: %s\nSeverity Index: %s\nRisk Multiplier: %.4f\n"
                                                + "Please deploy the relevant regional volunteering cells immediately.",
                                region, disasterType, severity, riskScore);

                String title = "URGENT RESPONSE: " + disasterType + " in " + region;

                Intervention intervention = Intervention.builder()
                                .committee(targetCommittee)
                                .interventionType(InterventionType.CATASTROPHE)
                                .title(title)
                                .description(description)
                                .locationGps(region)
                                .startDatetime(LocalDateTime.now())
                                .status(InterventionStatus.IN_PROGRESS)
                                .participantsCount(0)
                                .beneficiariesCount(0)
                                .build();

                interventionRepository.save(intervention);
                log.info("[CORE] Created Emergency Intervention for {} in {} (id={}, committee={})",
                                disasterType, region, intervention.getId(), targetCommittee.getName());
        }

        /**
         * H2 FIX: Attempt to find a committee whose name or region matches the
         * disaster alert's region string. Returns null if no match found.
         */
        private Committee findCommitteeByRegion(String region) {
                if (region == null || region.isBlank())
                        return null;
                String regionLower = region.toLowerCase().trim();

                List<Committee> allCommittees = committeeRepository.findAll();
                // Exact match on region field
                Optional<Committee> exact = allCommittees.stream()
                                .filter(c -> c.getRegion() != null && c.getRegion().equalsIgnoreCase(regionLower))
                                .findFirst();
                if (exact.isPresent())
                        return exact.get();

                // Partial match on name
                Optional<Committee> partial = allCommittees.stream()
                                .filter(c -> c.getName() != null && c.getName().toLowerCase().contains(regionLower))
                                .findFirst();
                return partial.orElse(null);
        }
}
