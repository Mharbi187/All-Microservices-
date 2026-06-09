package com.nexusaid.gateway.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;

@Component
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATH_PREFIXES = List.of(
            "/api/v1/auth/",
            "/api/v1/onboarding/public/",  // endpoints publics d'onboarding (comités, gouvernorats)
            "/api/v1/profiles/register",   // inscription directe
            "/actuator/",
            "/swagger-ui/",
            "/v3/api-docs/",
            "/core/v3/api-docs/",
            "/admin/v3/api-docs/",
            "/api/v1/admin/donations/receipts/",
            "/api/v1/admin/donations/needs/active",
            // ── Module 4 : Disaster Detection (dashboard public en lecture seule) ──
            "/api/v1/radar",
            "/api/v1/disasters/",
            "/api/v1/teams/",
            "/api/v1/crisis-room/",
            "/api/v1/logistics/",
            "/api/health");

    // Endpoints GET accessibles sans JWT (lecture publique pour la page d'inscription, etc.)
    private static final List<String> PUBLIC_GET_EXACT_PATHS = List.of(
            "/api/v1/management/committees",
            "/api/v1/news/public",
            "/api/v1/homepage/config");

    @Value("${jwt.public.key.path:}")
    private String publicKeyPath;

    @Value("${jwt.public.key:}")
    private String inlinePublicKey;

    private PublicKey publicKey;

    @PostConstruct
    public void init() throws Exception {
        String keyPem;
        if (inlinePublicKey != null && !inlinePublicKey.isBlank()) {
            keyPem = inlinePublicKey;
        } else if (publicKeyPath != null && !publicKeyPath.isBlank()) {
            keyPem = Files.readString(Paths.get(publicKeyPath));
        } else {
            throw new IllegalStateException(
                    "Gateway JWT public key is missing. Set jwt.public.key or jwt.public.key.path.");
        }

        String key = keyPem.replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("\\n", "")
                .replaceAll("\\s+", "");
        byte[] keyBytes = Base64.getDecoder().decode(key);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        this.publicKey = KeyFactory.getInstance("RSA").generatePublic(spec);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        org.springframework.http.HttpMethod method = request.getMethod();

        if (isPublicPath(path) || isFrontendPath(path) || isWebSocketUpgrade(request)
                || isPublicGetPath(path, method)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = Jwts.parser().verifyWith(publicKey).build().parseSignedClaims(token).getPayload();
            ServerHttpRequest mutatedRequest = request.mutate()
                    .header("X-Authenticated-User", claims.getSubject())
                    .build();
            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (Exception ex) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATH_PREFIXES.stream().anyMatch(path::startsWith);
    }

    /** GET exact-match public paths (ex: liste des comités pour la page d'inscription) */
    private boolean isPublicGetPath(String path, org.springframework.http.HttpMethod method) {
        return org.springframework.http.HttpMethod.GET.equals(method)
                && PUBLIC_GET_EXACT_PATHS.contains(path);
    }

    private boolean isFrontendPath(String path) {
        if (path == null || path.isBlank()) {
            return true;
        }
        if ("/".equals(path) || "/index.html".equals(path)) {
            return true;
        }
        if (path.startsWith("/assets/") || path.startsWith("/favicon")) {
            return true;
        }
        return !(path.startsWith("/api/")
                || path.startsWith("/ws/")
                || path.startsWith("/actuator/")
                || path.startsWith("/core/")
                || path.startsWith("/admin/"));
    }

    private boolean isWebSocketUpgrade(ServerHttpRequest request) {
        String upgrade = request.getHeaders().getFirst(HttpHeaders.UPGRADE);
        return upgrade != null && "websocket".equalsIgnoreCase(upgrade);
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
