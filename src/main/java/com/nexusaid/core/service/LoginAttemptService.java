package com.nexusaid.core.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force protection service.
 * Tracks login attempts per IP + email combination.
 *
 * Policy:
 * - After 2 failed attempts → CAPTCHA required
 * - After 5 failed attempts → IP blocked for 15 minutes
 * - Successful login → reset counter
 */
@Slf4j
@Service
public class LoginAttemptService {

    private static final int CAPTCHA_THRESHOLD = 2;
    private static final int BLOCK_THRESHOLD = 5;
    private static final long BLOCK_DURATION_MS = 15 * 60 * 1000L; // 15 minutes
    private static final long ENTRY_TTL_MS = 30 * 60 * 1000L;       // 30 minutes

    /**
     * Tracks failed login attempts per key (IP or IP:email).
     */
    private final Map<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    /**
     * Record a failed login attempt.
     */
    public void recordFailure(String ip, String email) {
        String ipKey = normalizeKey(ip);
        String combinedKey = normalizeKey(ip + ":" + email);

        // Track by IP alone
        attempts.compute(ipKey, (k, info) -> {
            if (info == null) info = new AttemptInfo();
            info.incrementFailure();
            return info;
        });

        // Track by IP:email combination
        attempts.compute(combinedKey, (k, info) -> {
            if (info == null) info = new AttemptInfo();
            info.incrementFailure();
            return info;
        });

        AttemptInfo ipInfo = attempts.get(ipKey);
        if (ipInfo != null && ipInfo.getFailCount() >= BLOCK_THRESHOLD) {
            ipInfo.block(BLOCK_DURATION_MS);
            log.warn("🚫 IP blocked due to {} failed login attempts: {}", ipInfo.getFailCount(), ip);
        }
    }

    /**
     * Record a successful login — resets the counters.
     */
    public void recordSuccess(String ip, String email) {
        String ipKey = normalizeKey(ip);
        String combinedKey = normalizeKey(ip + ":" + email);
        attempts.remove(combinedKey);

        // Only reset IP counter if it wasn't blocked
        AttemptInfo ipInfo = attempts.get(ipKey);
        if (ipInfo != null && !ipInfo.isCurrentlyBlocked()) {
            ipInfo.resetFailures();
        }
    }

    /**
     * Check if IP is currently blocked.
     */
    public boolean isBlocked(String ip) {
        AttemptInfo info = attempts.get(normalizeKey(ip));
        if (info == null) return false;

        if (info.isCurrentlyBlocked()) {
            return true;
        }

        // Block expired, reset
        if (info.wasBlocked()) {
            info.unblock();
        }
        return false;
    }

    /**
     * Check if CAPTCHA is required based on failed attempt count.
     */
    public boolean isCaptchaRequired(String ip, String email) {
        // Check by IP
        AttemptInfo ipInfo = attempts.get(normalizeKey(ip));
        if (ipInfo != null && ipInfo.getFailCount() >= CAPTCHA_THRESHOLD) {
            return true;
        }

        // Check by IP:email combo
        if (email != null) {
            AttemptInfo comboInfo = attempts.get(normalizeKey(ip + ":" + email));
            if (comboInfo != null && comboInfo.getFailCount() >= CAPTCHA_THRESHOLD) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the number of failed attempts for an IP.
     */
    public int getFailedAttempts(String ip) {
        AttemptInfo info = attempts.get(normalizeKey(ip));
        return info != null ? info.getFailCount() : 0;
    }

    /**
     * Get remaining block time in seconds for an IP.
     */
    public long getRemainingBlockSeconds(String ip) {
        AttemptInfo info = attempts.get(normalizeKey(ip));
        if (info == null || !info.isCurrentlyBlocked()) return 0;
        long remaining = (info.getBlockedUntil() - Instant.now().toEpochMilli()) / 1000;
        return Math.max(0, remaining);
    }

    /**
     * Clean expired entries every 5 minutes to prevent memory leaks.
     */
    @Scheduled(fixedRate = 300000)
    public void cleanExpiredEntries() {
        long now = Instant.now().toEpochMilli();
        attempts.entrySet().removeIf(entry -> {
            AttemptInfo info = entry.getValue();
            return (now - info.getLastAttemptTime()) > ENTRY_TTL_MS && !info.isCurrentlyBlocked();
        });
    }

    private String normalizeKey(String key) {
        return key == null ? "unknown" : key.trim().toLowerCase();
    }

    // ─── Inner class ───────────────────────────────────────────────

    private static class AttemptInfo {
        private int failCount = 0;
        private long lastAttemptTime = Instant.now().toEpochMilli();
        private long blockedUntil = 0;

        void incrementFailure() {
            this.failCount++;
            this.lastAttemptTime = Instant.now().toEpochMilli();
        }

        void resetFailures() {
            this.failCount = 0;
        }

        void block(long durationMs) {
            this.blockedUntil = Instant.now().toEpochMilli() + durationMs;
        }

        void unblock() {
            this.blockedUntil = 0;
            this.failCount = 0;
        }

        boolean isCurrentlyBlocked() {
            return blockedUntil > 0 && Instant.now().toEpochMilli() < blockedUntil;
        }

        boolean wasBlocked() {
            return blockedUntil > 0;
        }

        int getFailCount() {
            return failCount;
        }

        long getLastAttemptTime() {
            return lastAttemptTime;
        }

        long getBlockedUntil() {
            return blockedUntil;
        }
    }
}
