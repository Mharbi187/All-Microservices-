package com.nexusaid.core.messaging;

import com.nexusaid.core.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

        private final RabbitTemplate rabbitTemplate;

        public void publishInterventionCreated(UUID interventionId, String title, String type, UUID committeeId) {
                Map<String, Object> event = buildEvent("INTERVENTION_CREATED");
                event.put("interventionId", interventionId.toString());
                event.put("title", title);
                event.put("type", type);
                event.put("committeeId", committeeId.toString());
                publish(RabbitMQConfig.INTERVENTION_CREATED_KEY, event);
        }

        public void publishInterventionClosed(UUID interventionId) {
                Map<String, Object> event = buildEvent("INTERVENTION_CLOSED");
                event.put("interventionId", interventionId.toString());
                publish(RabbitMQConfig.INTERVENTION_CLOSED_KEY, event);
        }

        public void publishVolunteerRegistered(UUID volunteerId, String email, String fullName) {
                Map<String, Object> event = buildEvent("VOLUNTEER_REGISTERED");
                event.put("volunteerId", volunteerId.toString());
                event.put("email", email);
                event.put("fullName", fullName);
                publish(RabbitMQConfig.VOLUNTEER_REGISTERED_KEY, event);
        }

        public void publishVolunteerRoleAssigned(UUID volunteerId, String roleTitle, UUID committeeId) {
                Map<String, Object> event = buildEvent("VOLUNTEER_ROLE_ASSIGNED");
                event.put("volunteerId", volunteerId.toString());
                event.put("roleTitle", roleTitle);
                event.put("committeeId", committeeId.toString());
                publish(RabbitMQConfig.VOLUNTEER_ROLE_ASSIGNED_KEY, event);
        }

        public void publishInterventionAlert(UUID interventionId, String type, String description) {
                Map<String, Object> event = Map.of(
                                "eventType", "INTERVENTION_ALERT",
                                "interventionId", interventionId.toString(),
                                "type", type,
                                "description", description,
                                "timestamp", LocalDateTime.now().toString(),
                                "source", "core-service");
                rabbitTemplate.convertAndSend(RabbitMQConfig.NEXUSAID_EXCHANGE,
                                RabbitMQConfig.INTERVENTION_CREATED_KEY, event);
                log.info("Published intervention alert: {}", interventionId);
        }

        public void publishStockAlert(UUID itemId, String itemName, int currentQty, int threshold) {
                Map<String, Object> event = Map.of(
                                "eventType", "STOCK_LOW",
                                "itemId", itemId.toString(),
                                "itemName", itemName,
                                "currentQuantity", currentQty,
                                "threshold", threshold,
                                "timestamp", LocalDateTime.now().toString(),
                                "source", "core-service");
                rabbitTemplate.convertAndSend(RabbitMQConfig.NEXUSAID_EXCHANGE,
                                RabbitMQConfig.STOCK_ROUTING_KEY, event);
                log.info("Published stock alert for: {}", itemName);
        }

        public void publishDisasterAlert(String region, String disasterType, String severity) {
                Map<String, Object> event = Map.of(
                                "eventType", "DISASTER_DETECTED",
                                "region", region,
                                "disasterType", disasterType,
                                "severity", severity,
                                "timestamp", LocalDateTime.now().toString(),
                                "source", "disaster-detection");
                rabbitTemplate.convertAndSend(RabbitMQConfig.NEXUSAID_EXCHANGE,
                                RabbitMQConfig.DISASTER_ROUTING_KEY, event);
                log.info("Published disaster alert: {} in {}", disasterType, region);
        }

        private Map<String, Object> buildEvent(String eventType) {
                Map<String, Object> event = new HashMap<>();
                event.put("eventType", eventType);
                event.put("timestamp", LocalDateTime.now().toString());
                event.put("source", "core-service");
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
