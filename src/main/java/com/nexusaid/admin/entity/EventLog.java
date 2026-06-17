package com.nexusaid.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Persistence layer for domain events from RabbitMQ.
 * Stores intervention alerts, stock alerts, and other domain events
 * for audit trail and dashboard aggregation.
 */
@Entity
@Table(name = "event_logs", indexes = {
        @Index(name = "idx_event_type", columnList = "event_type"),
        @Index(name = "idx_event_source", columnList = "event_source"),
        @Index(name = "idx_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Event type from RabbitMQ: INTERVENTION_CREATED, INTERVENTION_CLOSED,
     * STOCK_LOW, VOLUNTEER_REGISTERED, DISASTER_DETECTED, etc.
     */
    @Column(nullable = false, length = 50)
    private String eventType;

    /**
     * Source service: "core-service", "admin-service", "disaster-detection"
     */
    @Column(nullable = false, length = 50)
    private String eventSource;

    /**
     * Event payload as JSON for flexible schema
     * E.g., {interventionId: "...", type: "...", description: "..."}
     */
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> payload;

    /**
     * Timestamp when the event was received (persisted)
     */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when the event was originally published
     * (extracted from the RabbitMQ message)
     */
    @Column(nullable = false)
    private LocalDateTime eventTimestamp;

    /**
     * Processing status: NEW, PROCESSED, ARCHIVED
     */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "NEW";

    /**
     * Optional: reference to related entity ID
     * (e.g., interventionId, itemId, etc.)
     */
    @Column(length = 36)
    private String relatedEntityId;

    /**
     * Optional: related entity type for filtering
     * (e.g., INTERVENTION, STOCK_ITEM, VOLUNTEER, DISASTER)
     */
    @Column(length = 50)
    private String relatedEntityType;

    /**
     * Optional: committee ID for multi-tenancy filtering
     */
    private UUID committeeId;
}
