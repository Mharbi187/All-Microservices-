package com.nexusaid.core.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppService {

    private final RestTemplate restTemplate;

    @Value("${openwa.url:http://openwa:8282}")
    private String openwaUrl;

    @Value("${openwa.api-key:nexusaid-wa-2026}")
    private String openwaApiKey;

    @Async
    public void sendWhatsAppMessage(String phone, String message) {
        try {
            if (phone == null || phone.isBlank()) {
                log.warn("[WhatsApp] No phone number provided, skipping WhatsApp notification.");
                return;
            }

            // Normalize phone number (remove spaces, plus, hyphens)
            String cleanPhone = phone.replaceAll("[\\s+\\-]", "");
            if (cleanPhone.length() == 8) {
                cleanPhone = "216" + cleanPhone; // Default to Tunisian country code
            }

            String chatId = cleanPhone + "@c.us";
            log.info("[WhatsApp] Attempting to send message to {} (chatId: {})", phone, chatId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", openwaApiKey);
            headers.set("Authorization", "Bearer " + openwaApiKey);

            // Fetch session ID dynamically
            String sessionsUrl = openwaUrl + "/api/sessions";
            ResponseEntity<List> response = restTemplate.exchange(
                    sessionsUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    List.class
            );

            List<?> sessions = response.getBody();
            if (sessions == null || sessions.isEmpty()) {
                log.error("[WhatsApp] No active OpenWA sessions found.");
                return;
            }

            // Get first session ID
            Map<?, ?> firstSession = (Map<?, ?>) sessions.get(0);
            String sessionId = String.valueOf(firstSession.get("id"));

            String sendUrl = openwaUrl + "/api/sessions/" + sessionId + "/messages/send-text";

            Map<String, String> payload = Map.of(
                    "chatId", chatId,
                    "text", message
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> sendResponse = restTemplate.postForEntity(sendUrl, request, Map.class);

            if (sendResponse.getStatusCode().is2xxSuccessful()) {
                log.info("[WhatsApp] Message sent successfully to {}", phone);
            } else {
                log.error("[WhatsApp] Failed to send message to {}: {}", phone, sendResponse.getStatusCode());
            }

        } catch (Exception e) {
            log.error("[WhatsApp] Error sending WhatsApp message to {}", phone, e);
        }
    }
}
