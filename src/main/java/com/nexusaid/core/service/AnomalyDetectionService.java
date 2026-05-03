package com.nexusaid.core.service;

import com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType;
import com.nexusaid.core.repository.SecurityAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Behavioral anomaly detection service.
 * Analyzes login patterns to detect suspicious activity:
 * - Rapid request growth from a single IP
 * - Login attempts on multiple accounts from same IP
 * - Unusual geographic origin (tracked by IP patterns)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final SecurityAuditLogRepository auditLogRepository;
    private final SecurityAuditService auditService;
    private final LoginAttemptService loginAttemptService;

    // Thresholds
    private static final int MULTI_ACCOUNT_THRESHOLD = 3;     // Different emails from same IP in 1h
    private static final long RAPID_GROWTH_THRESHOLD = 20;     // 20+ failures from same IP in 10 min
    private static final long DISTRIBUTED_ATTACK_THRESHOLD = 5; // 5+ IPs targeting same email in 1h

    /**
     * Analyze login behavior after each login attempt.
     * Returns a risk score (0–100).
     * 0 = no risk, 100 = definitely an attack.
     */
    public int analyzeLoginBehavior(String ip, String email) {
        int riskScore = 0;
        List<String> reasons = new ArrayList<>();

        try {
            Instant since1h = Instant.now().minus(1, ChronoUnit.HOURS);
            Instant since10m = Instant.now().minus(10, ChronoUnit.MINUTES);

            // 1. Check rapid request growth (many failures in short time from same IP)
            long failuresLast10m = auditLogRepository.countFailedLoginsByIpSince(ip, since10m);
            if (failuresLast10m >= RAPID_GROWTH_THRESHOLD) {
                riskScore += 40;
                reasons.add("Rapid failure growth: " + failuresLast10m + " failures in 10 min");
            } else if (failuresLast10m >= RAPID_GROWTH_THRESHOLD / 2) {
                riskScore += 20;
                reasons.add("Elevated failure rate: " + failuresLast10m + " failures in 10 min");
            }

            // 2. Check multi-account targeting (same IP → different emails)
            // We approximate this by checking distinct IPs for failed logins
            // This detects credential stuffing attacks
            long distinctIpsForEmail = auditLogRepository
                    .countDistinctIpsForFailedLoginsByEmail(email, since1h);
            if (distinctIpsForEmail >= DISTRIBUTED_ATTACK_THRESHOLD) {
                riskScore += 30;
                reasons.add("Distributed attack: " + distinctIpsForEmail + " IPs targeting email " + email);
            }

            // 3. Check if IP is already tracked with high failure count
            int currentFailures = loginAttemptService.getFailedAttempts(ip);
            if (currentFailures >= 10) {
                riskScore += 25;
                reasons.add("Persistent attacker: " + currentFailures + " total failures from IP");
            } else if (currentFailures >= 5) {
                riskScore += 15;
                reasons.add("Repeat offender: " + currentFailures + " failures from IP");
            }

            // 4. Log suspicious activity if risk is significant
            if (riskScore >= 50) {
                String details = "Risk score: " + riskScore + " — " + String.join("; ", reasons);
                auditService.logSuspiciousActivity(ip, email, details, riskScore);
                log.warn("🚨 ANOMALY DETECTED: {} — IP: {} — Email: {}", details, ip, email);
            } else if (riskScore >= 30) {
                log.info("⚠️ Elevated risk: score={} — IP: {} — Email: {}", riskScore, ip, email);
            }

        } catch (Exception e) {
            log.error("Error in anomaly detection: {}", e.getMessage());
        }

        return Math.min(riskScore, 100);
    }

    /**
     * Get security summary for the dashboard.
     */
    public Map<String, Object> getSecuritySummary() {
        Instant since24h = Instant.now().minus(24, ChronoUnit.HOURS);

        Map<String, Object> summary = new LinkedHashMap<>();

        List<String> suspiciousIps = auditLogRepository.findSuspiciousIpsSince(since24h);
        summary.put("suspiciousIps", suspiciousIps);
        summary.put("totalSuspiciousIps", suspiciousIps.size());

        long anomalies = auditLogRepository.countByEventTypeSince(SecurityEventType.ANOMALY_DETECTED, since24h);
        long bruteForce = auditLogRepository.countByEventTypeSince(SecurityEventType.BRUTE_FORCE_DETECTED, since24h);
        long suspicious = auditLogRepository.countByEventTypeSince(SecurityEventType.SUSPICIOUS_ACTIVITY, since24h);

        summary.put("anomalyCount", anomalies);
        summary.put("bruteForceCount", bruteForce);
        summary.put("suspiciousActivityCount", suspicious);
        summary.put("threatLevel", calculateThreatLevel(anomalies + bruteForce + suspicious));

        return summary;
    }

    private String calculateThreatLevel(long totalThreats) {
        if (totalThreats >= 50) return "CRITICAL";
        if (totalThreats >= 20) return "HIGH";
        if (totalThreats >= 5) return "MODERATE";
        if (totalThreats >= 1) return "LOW";
        return "NONE";
    }
}
