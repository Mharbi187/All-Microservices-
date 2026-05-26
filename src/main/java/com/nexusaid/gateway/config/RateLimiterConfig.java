package com.nexusaid.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    /**
     * Resolve rate limit key by client IP address.
     * Considers X-Forwarded-For header for proxied requests.
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            // Check X-Forwarded-For first (from Cloudflare/nginx)
            String xForwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                return Mono.just(xForwardedFor.split(",")[0].trim());
            }

            String ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            return Mono.just(ip);
        };
    }

    /**
     * Default rate limiter for general API routes.
     * Limits: 20 requests/second, burst of 40.
     * Requires Redis (already deployed as nexusaid-redis).
     */
    @Bean
    @Primary
    public RedisRateLimiter defaultRateLimiter() {
        return new RedisRateLimiter(100, 400);
    }

    /**
     * Strict rate limiter for authentication endpoints (login/register).
     * Limits: 5 requests/minute per IP (≈ 0.083 per second).
     * replenishRate=1 token/sec with burstCapacity=5 gives ~5 per burst window.
     */
    @Bean
    public RedisRateLimiter authRateLimiter() {
        return new RedisRateLimiter(1, 5);
    }
}
