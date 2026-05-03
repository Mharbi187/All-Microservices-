package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Security audit log entity.
 * Records all security-relevant events for monitoring, compliance, and threat detection.
 */
@Entity
@Table(name = "security_audit_logs", indexes = {
        @Index(name = "idx_audit_event_type", columnList = "event_type"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
        @Index(name = "idx_audit_ip", columnList = "ip_address"),
        @Index(name = "idx_audit_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private SecurityEventType eventType;

    @Column(name = "user_id")
    private UUID userId;

    @Column(length = 255)
    private String email;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(length = 1024)
    private String details;

    @Column(nullable = false)
    @Builder.Default
    private boolean success = false;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    @Column(name = "risk_score")
    @Builder.Default
    private int riskScore = 0;

    // ─── Event Types ────────────────────────────────────────────────

    public enum SecurityEventType {
        LOGIN_SUCCESS,
        LOGIN_FAILURE,
        REGISTER,
        TOKEN_REFRESH,
        LOGOUT,
        BLOCKED_IP,
        CAPTCHA_TRIGGERED,
        CAPTCHA_FAILED,
        SUSPICIOUS_ACTIVITY,
        PASSWORD_CHANGE,
        ACCOUNT_LOCKED,
        BRUTE_FORCE_DETECTED,
        ANOMALY_DETECTED
    }
}
