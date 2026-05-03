package com.nexusaid.core.repository;

import com.nexusaid.core.entity.SecurityAuditLog;
import com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {

    /**
     * Get recent audit logs ordered by timestamp.
     */
    Page<SecurityAuditLog> findAllByOrderByTimestampDesc(Pageable pageable);

    /**
     * Get logs by event type.
     */
    List<SecurityAuditLog> findByEventTypeOrderByTimestampDesc(SecurityEventType eventType, Pageable pageable);

    /**
     * Get logs for a specific IP address.
     */
    List<SecurityAuditLog> findByIpAddressOrderByTimestampDesc(String ipAddress, Pageable pageable);

    /**
     * Count events by type in a time range.
     */
    @Query("SELECT COUNT(l) FROM SecurityAuditLog l WHERE l.eventType = :type AND l.timestamp >= :since")
    long countByEventTypeSince(@Param("type") SecurityEventType type, @Param("since") Instant since);

    /**
     * Count failed login attempts from an IP in a time range.
     */
    @Query("SELECT COUNT(l) FROM SecurityAuditLog l WHERE l.ipAddress = :ip AND l.eventType = 'LOGIN_FAILURE' AND l.timestamp >= :since")
    long countFailedLoginsByIpSince(@Param("ip") String ip, @Param("since") Instant since);

    /**
     * Get distinct IPs with suspicious activity.
     */
    @Query("SELECT DISTINCT l.ipAddress FROM SecurityAuditLog l WHERE l.eventType IN ('BLOCKED_IP', 'BRUTE_FORCE_DETECTED', 'SUSPICIOUS_ACTIVITY') AND l.timestamp >= :since")
    List<String> findSuspiciousIpsSince(@Param("since") Instant since);

    /**
     * Get recent events (last N) for a user.
     */
    List<SecurityAuditLog> findByUserIdOrderByTimestampDesc(UUID userId, Pageable pageable);

    /**
     * Count distinct IPs used for failed logins on a specific email.
     */
    @Query("SELECT COUNT(DISTINCT l.ipAddress) FROM SecurityAuditLog l WHERE l.email = :email AND l.eventType = 'LOGIN_FAILURE' AND l.timestamp >= :since")
    long countDistinctIpsForFailedLoginsByEmail(@Param("email") String email, @Param("since") Instant since);

    /**
     * Dashboard: count events grouped by type for a given period.
     */
    @Query("SELECT l.eventType, COUNT(l) FROM SecurityAuditLog l WHERE l.timestamp >= :since GROUP BY l.eventType")
    List<Object[]> countEventsByTypeSince(@Param("since") Instant since);
}
