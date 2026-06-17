package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.EventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EventLogRepository extends JpaRepository<EventLog, UUID> {
    
    /**
     * Find events by type (e.g., INTERVENTION_CREATED, STOCK_LOW)
     */
    List<EventLog> findByEventType(String eventType);
    
    /**
     * Find events by source service
     */
    List<EventLog> findByEventSource(String eventSource);
    
    /**
     * Find recent events for dashboard
     */
    Page<EventLog> findByCreatedAtAfter(LocalDateTime since, Pageable pageable);
    
    /**
     * Find unprocessed events
     */
    List<EventLog> findByStatus(String status);
    
    /**
     * Find events related to specific entity
     */
    List<EventLog> findByRelatedEntityIdAndRelatedEntityType(String entityId, String entityType);
    
    /**
     * Find events for a committee
     */
    Page<EventLog> findByCommitteeId(UUID committeeId, Pageable pageable);
    
    /**
     * Count events by type
     */
    long countByEventType(String eventType);
}
