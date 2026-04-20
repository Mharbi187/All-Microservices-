package com.nexusaid.admin.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.public.key.path:}")
    private String publicKeyPath;

    @Value("${jwt.public.key:}")
    private String inlinePublicKey;

    private PublicKey publicKey;

    @PostConstruct
    public void init() throws Exception {
        String key = "";
        if (inlinePublicKey != null && !inlinePublicKey.isEmpty()) {
            key = inlinePublicKey;
        } else if (publicKeyPath != null && !publicKeyPath.isEmpty()) {
            key = new String(java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(publicKeyPath)));
        } else {
            try {
                key = new String(new org.springframework.core.io.ClassPathResource("public.pem").getInputStream()
                        .readAllBytes());
            } catch (Exception e) {
                throw new IllegalStateException(
                        "JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH is required but missing, and public.pem is not on classpath.");
            }
        }

        key = key.replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("\\n", "")
                .replaceAll("\\s+", "");
        byte[] keyBytes = Base64.getDecoder().decode(key);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        this.publicKey = kf.generatePublic(spec);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public UUID extractUserId(String token) {
        return extractClaim(token, claims -> {
            String userIdStr = claims.get("userId", String.class);
            return userIdStr != null ? UUID.fromString(userIdStr) : null;
        });
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
