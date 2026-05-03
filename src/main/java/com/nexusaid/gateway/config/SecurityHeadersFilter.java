package com.nexusaid.gateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Global security headers filter for the API Gateway.
 * Injects OWASP-recommended HTTP security headers into every response.
 *
 * Headers added:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: DENY (prevent clickjacking)
 * - X-XSS-Protection: 1; mode=block (legacy XSS filter)
 * - Strict-Transport-Security (HSTS for HTTPS enforcement)
 * - Content-Security-Policy (prevent XSS, code injection)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy (restrict browser features)
 * - Cache-Control for sensitive endpoints
 */
@Component
public class SecurityHeadersFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpResponse response = exchange.getResponse();

        // Use beforeCommit() to safely add headers BEFORE the response is sent.
        // Using .then(Mono.fromRunnable()) would throw UnsupportedOperationException
        // because headers cannot be modified after the response is committed.
        response.beforeCommit(() -> {
            HttpHeaders headers = response.getHeaders();

            // Prevent MIME type sniffing
            headers.addIfAbsent("X-Content-Type-Options", "nosniff");

            // Prevent clickjacking
            headers.addIfAbsent("X-Frame-Options", "DENY");

            // Legacy XSS protection
            headers.addIfAbsent("X-XSS-Protection", "1; mode=block");

            // HTTP Strict Transport Security (1 year)
            headers.addIfAbsent("Strict-Transport-Security",
                    "max-age=31536000; includeSubDomains; preload");

            // Content Security Policy
            headers.addIfAbsent("Content-Security-Policy",
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com; " +
                    "img-src 'self' data: https: blob:; " +
                    "connect-src 'self'; " +
                    "frame-src 'self'; " +
                    "object-src 'none'; " +
                    "base-uri 'self'");

            // Referrer Policy
            headers.addIfAbsent("Referrer-Policy", "strict-origin-when-cross-origin");

            // Permissions Policy
            headers.addIfAbsent("Permissions-Policy",
                    "camera=(), microphone=(), geolocation=(self), payment=()");

            // No-cache for sensitive auth endpoints
            String path = exchange.getRequest().getURI().getPath();
            if (path != null && (path.contains("/auth/") || path.contains("/security/"))) {
                headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
                headers.set("Pragma", "no-cache");
            }

            return Mono.empty();
        });

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // IMPORTANT: Must run AFTER routing (positive = low priority = last).
        // Running before routing (-50) interferes with the reactive pipeline
        // and causes requests to be misrouted to the frontend catch-all route.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
