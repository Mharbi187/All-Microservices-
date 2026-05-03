package com.nexusaid.core.controller;

import com.nexusaid.core.entity.SecurityAuditLog;
import com.nexusaid.core.service.AnomalyDetectionService;
import com.nexusaid.core.service.LoginAttemptService;
import com.nexusaid.core.service.SecurityAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Security monitoring dashboard API.
 * Provides endpoints for admin users to view security metrics,
 * audit logs, blocked IPs, and anomaly reports.
 */
@RestController
@RequestMapping("/api/v1/security")
@RequiredArgsConstructor
public class SecurityDashboardController {

    private final SecurityAuditService auditService;
    private final AnomalyDetectionService anomalyService;
    private final LoginAttemptService loginAttemptService;

    /**
     * GET /api/v1/security/dashboard
     * Returns aggregated security statistics for the last 24 hours.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> stats = auditService.getDashboardStats();
        Map<String, Object> security = anomalyService.getSecuritySummary();
        stats.putAll(security);
        return ResponseEntity.ok(stats);
    }

    /**
     * GET /api/v1/security/audit-logs
     * Returns paginated security audit logs.
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<Page<SecurityAuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(auditService.getRecentLogs(page, size));
    }

    /**
     * GET /api/v1/security/blocked-ips
     * Returns list of blocked/suspicious IPs with details.
     */
    @GetMapping("/blocked-ips")
    public ResponseEntity<List<Map<String, Object>>> getBlockedIps() {
        return ResponseEntity.ok(auditService.getBlockedIps());
    }

    /**
     * POST /api/v1/security/unblock-ip
     * Manually unblock an IP address.
     */
    @PostMapping("/unblock-ip")
    public ResponseEntity<Map<String, String>> unblockIp(@RequestBody Map<String, String> request) {
        String ip = request.get("ip");
        if (ip == null || ip.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "IP address is required"));
        }

        // Record success to clear the IP's attempt counter
        loginAttemptService.recordSuccess(ip, "manual-unblock");
        return ResponseEntity.ok(Map.of("message", "IP " + ip + " has been unblocked", "ip", ip));
    }

    /**
     * GET /api/v1/security/threat-summary
     * Returns the current threat level and summary.
     */
    @GetMapping("/threat-summary")
    public ResponseEntity<Map<String, Object>> getThreatSummary() {
        return ResponseEntity.ok(anomalyService.getSecuritySummary());
    }
}
