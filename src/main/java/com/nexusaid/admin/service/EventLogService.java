package com.nexusaid.admin.service;

import com.nexusaid.admin.entity.EventLog;
import com.nexusaid.admin.repository.EventLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for querying and managing event logs.
 * Provides audit trail and event history for dashboard aggregation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventLogService {
    
    private final EventLogRepository eventLogRepository;
    
    /**
     * Get recent events for dashboard
     */
    public Page<EventLog> getRecentEvents(LocalDateTime since, Pageable pageable) {
        return eventLogRepository.findByCreatedAtAfter(since, pageable);
    }
    
    /**
     * Get events by type
     */
    public List<EventLog> getEventsByType(String eventType) {
        return eventLogRepository.findByEventType(eventType);
    }
    
    /**
     * Get events by source service
     */
    public List<EventLog> getEventsBySource(String source) {
        return eventLogRepository.findByEventSource(source);
    }
    
    /**
     * Get events related to specific entity
     */
    public List<EventLog> getEventsByEntity(String entityId, String entityType) {
        return eventLogRepository.findByRelatedEntityIdAndRelatedEntityType(entityId, entityType);
    }
    
    /**
     * Get committee-specific events
     */
    public Page<EventLog> getCommitteeEvents(UUID committeeId, Pageable pageable) {
        return eventLogRepository.findByCommitteeId(committeeId, pageable);
    }
    
    /**
     * Mark event as processed
     */
    public void markEventProcessed(UUID eventId) {
        eventLogRepository.findById(eventId).ifPresent(event -> {
            event.setStatus("PROCESSED");
            eventLogRepository.save(event);
        });
    }
    
    /**
     * Get event statistics
     */
    public Map<String, Long> getEventStatistics() {
        return Map.of(
            "INTERVENTION_ALERT", eventLogRepository.countByEventType("INTERVENTION_ALERT"),
            "STOCK_ALERT", eventLogRepository.countByEventType("STOCK_ALERT"),
            "DISASTER_DETECTED", eventLogRepository.countByEventType("DISASTER_DETECTED"),
            "VOLUNTEER_REGISTERED", eventLogRepository.countByEventType("VOLUNTEER_REGISTERED")
        );
    }
}
