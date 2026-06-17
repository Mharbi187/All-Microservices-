package com.nexusaid.admin.messaging;

import com.nexusaid.admin.entity.EventLog;
import com.nexusaid.admin.entity.MonthlyReport;
import com.nexusaid.admin.entity.enums.MonthlyReportStatus;
import com.nexusaid.admin.repository.EventLogRepository;
import com.nexusaid.admin.repository.MonthlyReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Consumes events from RabbitMQ published by MS1 (Core) and MS4 (Disaster
 * Detection).
 * Implements real inter-service communication:
 * - MS4 disaster alerts automatically create DRAFT situation reports
 * - MS1 intervention alerts are persisted to event log for audit trail
 * - MS1 stock alerts are persisted to event log for notification
 * - VOLUNTEER_REGISTERED and VOLUNTEER_ROLE_ASSIGNED are persisted for audit
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventConsumer {

        private final MonthlyReportRepository monthlyReportRepo;
        private final EventLogRepository eventLogRepo;

        @RabbitListener(queues = "nexusaid.intervention.alerts")
        public void handleInterventionAlert(Map<String, Object> event) {
                String eventType = String.valueOf(event.getOrDefault("eventType", "INTERVENTION_EVENT"));
                log.info("[ADMIN] Received intervention event: eventType={}, intervention={}",
                                eventType, event.get("interventionId"));

                // Persist event to audit trail
                persistEvent(eventType, "core-service", event,
                                String.valueOf(event.get("interventionId")), "INTERVENTION");
        }

        @RabbitListener(queues = "nexusaid.stock.alerts")
        public void handleStockAlert(Map<String, Object> event) {
                log.info("[ADMIN] Received stock alert: item={}, qty={}",
                                event.get("itemName"), event.get("currentQuantity"));

                // Persist event to audit trail
                persistEvent(String.valueOf(event.getOrDefault("eventType", "STOCK_ALERT")), "core-service", event,
                                String.valueOf(event.get("itemId")), "STOCK_ITEM");
        }

        /**
         * When MS4 (Disaster Detection) detects a crisis via GEE, it publishes to this
         * queue.
         * This consumer auto-creates a DRAFT Situation Report in the reporting module,
         * bridging the gap between the crisis room (MS4) and reporting (MS3).
         */
        @RabbitListener(queues = "nexusaid.disaster.alerts")
        public void handleDisasterAlert(Map<String, Object> event) {
                // H6 FIX: Schema validation — reject malformed events
                for (String field : java.util.Set.of("disasterType", "region", "severity")) {
                        if (!event.containsKey(field) || event.get(field) == null) {
                                log.warn("[ADMIN] Rejecting malformed disaster alert — missing '{}': {}", field, event);
                                return;
                        }
                }

                String disasterType = String.valueOf(event.get("disasterType"));
                String region = String.valueOf(event.get("region"));
                String severity = String.valueOf(event.get("severity"));
                Object riskScoreObj = event.getOrDefault("riskScore", 0.0);
                double riskScore = riskScoreObj instanceof Number ? ((Number) riskScoreObj).doubleValue() : 0.0;

                log.info("[ADMIN] Disaster alert received from MS4: type={}, region={}, severity={}, risk={}",
                                disasterType, region, severity, riskScore);

                // Auto-create a DRAFT situational report for this disaster
                String content = String.format(
                                "{\"title\":\"SITREP - %s in %s\","
                                                + "\"disasterType\":\"%s\","
                                                + "\"region\":\"%s\","
                                                + "\"severity\":\"%s\","
                                                + "\"riskScore\":%.4f,"
                                                + "\"source\":\"MS4-AutoDetection\","
                                                + "\"status\":\"Awaiting field validation\","
                                                + "\"notes\":\"Auto-generated from disaster detection system. Requires field confirmation.\"}",
                                disasterType, region, disasterType, region, severity, riskScore);

                MonthlyReport sitrep = MonthlyReport.builder()
                                .reportPeriod(LocalDate.now())
                                .reportType("SITREP_" + disasterType)
                                .content(content)
                                .status(MonthlyReportStatus.DRAFT)
                                .build();

                monthlyReportRepo.save(sitrep);
                log.info("[ADMIN] Auto-created DRAFT SitRep for {} in {} (id={})",
                                disasterType, region, sitrep.getId());

                // Also persist to event log
                persistEvent("DISASTER_DETECTED", "disaster-detection", event,
                                null, "DISASTER");
        }

        @RabbitListener(queues = "nexusaid.volunteer.events")
        public void handleVolunteerEvents(Map<String, Object> event) {
                String eventType = String.valueOf(event.getOrDefault("eventType", "VOLUNTEER_EVENT"));
                String volunteerId = String.valueOf(event.getOrDefault("volunteerId", ""));
                log.info("[ADMIN] Received volunteer event: eventType={}, volunteerId={}", eventType, volunteerId);
                persistEvent(eventType, "core-service", event, volunteerId, "VOLUNTEER");
        }

        /**
         * Helper method to persist any event to the audit log
         */
        private void persistEvent(String eventType, String source, Map<String, Object> payload,
                        String relatedEntityId, String relatedEntityType) {
                try {
                        EventLog eventLog = EventLog.builder()
                                        .eventType(eventType)
                                        .eventSource(source)
                                        .payload(payload)
                                        .createdAt(LocalDateTime.now())
                                        .eventTimestamp(LocalDateTime.now())
                                        .status("NEW")
                                        .relatedEntityId(relatedEntityId)
                                        .relatedEntityType(relatedEntityType)
                                        .build();
                        eventLogRepo.save(eventLog);
                        log.info("[AUDIT] Event persisted: type={}, source={}, entity={}",
                                        eventType, source, relatedEntityId);
                } catch (Exception e) {
                        log.error("[AUDIT] Failed to persist event: {}", eventType, e);
                }
        }
}
