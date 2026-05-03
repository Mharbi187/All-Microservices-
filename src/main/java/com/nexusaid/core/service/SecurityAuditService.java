package com.nexusaid.core.service;

import com.nexusaid.core.entity.SecurityAuditLog;
import com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType;
import com.nexusaid.core.repository.SecurityAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Centralized security event logging and querying service.
 * All security-relevant actions are traced for compliance and threat detection.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityAuditService {

    private final SecurityAuditLogRepository auditLogRepository;

    /**
     * Log a security event asynchronously to avoid blocking the main flow.
     */
    @Async
    @Transactional
    public void logEvent(SecurityEventType eventType, UUID userId, String email,
                         String ipAddress, String userAgent, String details,
                         boolean success, int riskScore) {
        try {
            SecurityAuditLog logEntry = SecurityAuditLog.builder()
                    .eventType(eventType)
                    .userId(userId)
                    .email(email)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .details(details)
                    .success(success)
                    .riskScore(riskScore)
                    .build();
            auditLogRepository.save(logEntry);
            log.debug("Security event logged: {} for {} from IP {}", eventType, email, ipAddress);
        } catch (Exception e) {
            // Never let audit logging break the main flow
            log.error("Failed to log security event: {}", e.getMessage());
        }
    }

    /**
     * Quick log for common events.
     */
    public void logLoginSuccess(UUID userId, String email, String ip, String userAgent) {
        logEvent(SecurityEventType.LOGIN_SUCCESS, userId, email, ip, userAgent,
                "Login successful", true, 0);
    }

    public void logLoginFailure(String email, String ip, String userAgent, String reason) {
        logEvent(SecurityEventType.LOGIN_FAILURE, null, email, ip, userAgent,
                reason, false, 20);
    }

    public void logCaptchaTriggered(String email, String ip, int failedAttempts) {
        logEvent(SecurityEventType.CAPTCHA_TRIGGERED, null, email, ip, null,
                "CAPTCHA triggered after " + failedAttempts + " failed attempts", false, 30);
    }

    public void logBlockedIp(String ip, String email, int failedAttempts) {
        logEvent(SecurityEventType.BLOCKED_IP, null, email, ip, null,
                "IP blocked after " + failedAttempts + " failed attempts", false, 80);
    }

    public void logSuspiciousActivity(String ip, String email, String details, int riskScore) {
        logEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, null, email, ip, null,
                details, false, riskScore);
    }

    public void logTokenRefresh(UUID userId, String email, String ip) {
        logEvent(SecurityEventType.TOKEN_REFRESH, userId, email, ip, null,
                "Token refreshed", true, 0);
    }

    public void logLogout(UUID userId, String email, String ip) {
        logEvent(SecurityEventType.LOGOUT, userId, email, ip, null,
                "User logged out", true, 0);
    }

    // ─── Dashboard Queries ──────────────────────────────────────────

    /**
     * Get paginated recent audit logs.
     */
    public Page<SecurityAuditLog> getRecentLogs(int page, int size) {
        return auditLogRepository.findAllByOrderByTimestampDesc(PageRequest.of(page, size));
    }

    /**
     * Get security dashboard statistics for the last 24 hours.
     */
    public Map<String, Object> getDashboardStats() {
        Instant since24h = Instant.now().minus(24, ChronoUnit.HOURS);
        Instant since1h = Instant.now().minus(1, ChronoUnit.HOURS);

        Map<String, Object> stats = new LinkedHashMap<>();

        // Event counts by type (last 24h)
        List<Object[]> eventCounts = auditLogRepository.countEventsByTypeSince(since24h);
        Map<String, Long> eventMap = new LinkedHashMap<>();
        for (Object[] row : eventCounts) {
            eventMap.put(((SecurityEventType) row[0]).name(), (Long) row[1]);
        }
        stats.put("eventCounts24h", eventMap);

        // Key metrics
        stats.put("loginSuccessCount", auditLogRepository.countByEventTypeSince(SecurityEventType.LOGIN_SUCCESS, since24h));
        stats.put("loginFailureCount", auditLogRepository.countByEventTypeSince(SecurityEventType.LOGIN_FAILURE, since24h));
        stats.put("blockedIpCount", auditLogRepository.countByEventTypeSince(SecurityEventType.BLOCKED_IP, since24h));
        stats.put("captchaTriggeredCount", auditLogRepository.countByEventTypeSince(SecurityEventType.CAPTCHA_TRIGGERED, since24h));
        stats.put("suspiciousActivityCount", auditLogRepository.countByEventTypeSince(SecurityEventType.SUSPICIOUS_ACTIVITY, since24h));

        // Rate (last 1h)
        stats.put("failuresLastHour", auditLogRepository.countByEventTypeSince(SecurityEventType.LOGIN_FAILURE, since1h));

        // Suspicious IPs
        List<String> suspiciousIps = auditLogRepository.findSuspiciousIpsSince(since24h);
        stats.put("suspiciousIps", suspiciousIps);
        stats.put("suspiciousIpCount", suspiciousIps.size());

        return stats;
    }

    /**
     * Get blocked IPs list with details.
     */
    public List<Map<String, Object>> getBlockedIps() {
        Instant since = Instant.now().minus(24, ChronoUnit.HOURS);
        List<String> ips = auditLogRepository.findSuspiciousIpsSince(since);

        return ips.stream().map(ip -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("ip", ip);
            entry.put("failedAttempts", auditLogRepository.countFailedLoginsByIpSince(ip, since));

            List<SecurityAuditLog> recentLogs = auditLogRepository
                    .findByIpAddressOrderByTimestampDesc(ip, PageRequest.of(0, 5));
            entry.put("recentEvents", recentLogs);
            return entry;
        }).collect(Collectors.toList());
    }

    /**
     * Clean old audit logs (older than 90 days) — scheduled nightly.
     */
    @Scheduled(cron = "0 0 3 * * ?") // 3 AM daily
    @Transactional
    public void cleanOldLogs() {
        Instant cutoff = Instant.now().minus(90, ChronoUnit.DAYS);
        // Custom query could be added; for now we rely on DB retention policies
        log.info("Audit log cleanup triggered for entries older than {}", cutoff);
    }
}
