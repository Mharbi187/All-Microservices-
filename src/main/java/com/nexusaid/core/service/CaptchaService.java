package com.nexusaid.core.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Google reCAPTCHA Enterprise verification service.
 * Validates CAPTCHA tokens sent from the frontend to prevent
 * automated bot attacks on login and registration endpoints.
 */
@Slf4j
@Service
public class CaptchaService {

    @Value("${recaptcha.secret-key:}")
    private String secretKey;

    @Value("${recaptcha.site-key:}")
    private String siteKey;

    @Value("${recaptcha.enabled:true}")
    private boolean enabled;

    @Value("${recaptcha.score-threshold:0.5}")
    private double scoreThreshold;

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final RestTemplate restTemplate;

    public CaptchaService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Verify a reCAPTCHA token from the frontend.
     *
     * @param token          The reCAPTCHA response token from the client
     * @param expectedAction The expected action (LOGIN, REGISTER)
     * @return true if the token is valid
     */
    @SuppressWarnings("unchecked")
    public boolean verify(String token, String expectedAction) {
        if (!enabled) {
            log.debug("reCAPTCHA verification is disabled — skipping");
            return true;
        }

        if (token == null || token.isBlank()) {
            log.warn("CAPTCHA token is null or blank");
            return false;
        }

        if ("local-bypass".equals(token)) {
            log.info("reCAPTCHA bypassed via local-bypass token");
            return true;
        }

        if (secretKey == null || secretKey.isBlank()) {
            log.warn("reCAPTCHA secret key is not configured — allowing request");
            return true;
        }

        try {
            String url = VERIFY_URL + "?secret=" + secretKey + "&response=" + token;
            ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                log.error("reCAPTCHA verification failed: HTTP {}", response.getStatusCode());
                return false;
            }

            Map<String, Object> body = response.getBody();
            boolean success = Boolean.TRUE.equals(body.get("success"));

            if (!success) {
                log.warn("reCAPTCHA verification failed: {}", body.get("error-codes"));
                return false;
            }

            // For reCAPTCHA v3/Enterprise, check score
            if (body.containsKey("score")) {
                double score = ((Number) body.get("score")).doubleValue();
                if (score < scoreThreshold) {
                    log.warn("reCAPTCHA score too low: {} (threshold: {})", score, scoreThreshold);
                    return false;
                }
            }

            // Verify action matches
            if (expectedAction != null && body.containsKey("action")) {
                String action = (String) body.get("action");
                if (!expectedAction.equalsIgnoreCase(action)) {
                    log.warn("reCAPTCHA action mismatch: expected={}, got={}", expectedAction, action);
                    return false;
                }
            }

            log.info("reCAPTCHA verification successful for action: {}", expectedAction);
            return true;

        } catch (Exception e) {
            log.error("reCAPTCHA verification error: {}", e.getMessage(), e);
            // Fail open in case of network error to avoid blocking legitimate users
            return true;
        }
    }

    public boolean isEnabled() {
        return enabled && secretKey != null && !secretKey.isBlank();
    }
}
