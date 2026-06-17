package com.nexusaid.admin.controller;

import com.nexusaid.admin.entity.EventLog;
import com.nexusaid.admin.service.EventLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * REST controller for event log queries.
 * Exposes audit trail and event history for dashboard and reporting.
 */
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Slf4j
public class EventLogController {
    
    private final EventLogService eventLogService;
    
    /**
     * Get recent events (last N hours)
     * GET /api/v1/events/recent?hours=24&page=0&size=20
     */
    @GetMapping("/recent")
    public ResponseEntity<Page<EventLog>> getRecentEvents(
            @RequestParam(defaultValue = "24") int hours,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        Page<EventLog> events = eventLogService.getRecentEvents(since, pageable);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get events by type
     * GET /api/v1/events/by-type?type=INTERVENTION_ALERT
     */
    @GetMapping("/by-type")
    public ResponseEntity<List<EventLog>> getEventsByType(@RequestParam String type) {
        List<EventLog> events = eventLogService.getEventsByType(type);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get events by source service
     * GET /api/v1/events/by-source?source=core-service
     */
    @GetMapping("/by-source")
    public ResponseEntity<List<EventLog>> getEventsBySource(@RequestParam String source) {
        List<EventLog> events = eventLogService.getEventsBySource(source);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get events related to an entity
     * GET /api/v1/events/by-entity?entityId=xxx&entityType=INTERVENTION
     */
    @GetMapping("/by-entity")
    public ResponseEntity<List<EventLog>> getEventsByEntity(
            @RequestParam String entityId,
            @RequestParam String entityType) {
        List<EventLog> events = eventLogService.getEventsByEntity(entityId, entityType);
        return ResponseEntity.ok(events);
    }
    
    /**
     * Get event statistics
     * GET /api/v1/events/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getEventStatistics() {
        Map<String, Long> stats = eventLogService.getEventStatistics();
        return ResponseEntity.ok(stats);
    }
}
