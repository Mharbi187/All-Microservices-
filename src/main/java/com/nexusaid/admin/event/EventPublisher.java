package com.nexusaid.admin.event;

import com.nexusaid.admin.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Event publisher for admin-service (MS3).
 * Publishes domain events to RabbitMQ for downstream consumers (MS1).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishDonationReceived(UUID donationId, UUID donorId, String donationType, double amount) {
        Map<String, Object> event = buildEvent("DONATION_RECEIVED");
        event.put("donationId", donationId.toString());
        event.put("donorId", donorId.toString());
        event.put("donationType", donationType);
        event.put("amount", amount);
        publish(RabbitMQConfig.DONATION_RECEIVED_KEY, event);
    }

    public void publishReportPublished(UUID reportId, UUID committeeId, String reportType) {
        Map<String, Object> event = buildEvent("REPORT_PUBLISHED");
        event.put("reportId", reportId.toString());
        event.put("committeeId", committeeId.toString());
        event.put("reportType", reportType);
        publish(RabbitMQConfig.REPORT_PUBLISHED_KEY, event);
    }

    private Map<String, Object> buildEvent(String eventType) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", eventType);
        event.put("timestamp", LocalDateTime.now().toString());
        event.put("source", "admin-service");
        return event;
    }

    private void publish(String routingKey, Map<String, Object> event) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.NEXUSAID_EXCHANGE, routingKey, event);
            log.info("Published event [{}] with routing key [{}]", event.get("eventType"), routingKey);
        } catch (Exception e) {
            log.error("Failed to publish event [{}]: {}", event.get("eventType"), e.getMessage(), e);
        }
    }
}
