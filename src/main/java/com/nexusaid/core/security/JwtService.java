package com.nexusaid.core.security;

import com.nexusaid.core.entity.RefreshToken;
import com.nexusaid.core.repository.RefreshTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.private.key.path:}")
    private String privateKeyPath;

    @Value("${jwt.private.key:}")
    private String inlinePrivateKey;

    @Value("${security.jwt.expiration:1800000}")
    private long jwtExpiration; // 30 minutes default

    @Value("${security.jwt.refresh-expiration:604800000}")
    private long refreshExpiration; // 7 days default

    private PrivateKey privateKey;
    private java.security.PublicKey publicKey;

    private final RefreshTokenRepository refreshTokenRepository;

    public JwtService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @PostConstruct
    public void init() throws Exception {
        String key = "";
        if (inlinePrivateKey != null && !inlinePrivateKey.isEmpty()) {
            key = inlinePrivateKey;
        } else if (privateKeyPath != null && !privateKeyPath.isEmpty()) {
            key = new String(java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(privateKeyPath)));
        } else {
            try {
                key = new String(new org.springframework.core.io.ClassPathResource("private.pem").getInputStream()
                        .readAllBytes());
            } catch (Exception e) {
                throw new IllegalStateException(
                        "JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH is required but missing, and private.pem is not on classpath.");
            }
        }

        key = key.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("\\n", "")
                .replaceAll("\\s+", "");
        byte[] keyBytes = Base64.getDecoder().decode(key);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        this.privateKey = kf.generatePrivate(spec);
        if (this.privateKey instanceof java.security.interfaces.RSAPrivateCrtKey) {
            java.security.interfaces.RSAPrivateCrtKey crt = (java.security.interfaces.RSAPrivateCrtKey) this.privateKey;
            this.publicKey = kf
                    .generatePublic(new java.security.spec.RSAPublicKeySpec(crt.getModulus(), crt.getPublicExponent()));
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public UUID extractUserId(String token) {
        return extractClaim(token, claims -> UUID.fromString(claims.get("userId", String.class)));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ─── Refresh Token Management ──────────────────────────────────

    /**
     * Create a new refresh token for a user.
     */
    @Transactional
    public RefreshToken createRefreshToken(UUID userId) {
        RefreshToken refreshToken = RefreshToken.builder()
                .token(UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString())
                .userId(userId)
                .expiresAt(Instant.now().plusMillis(refreshExpiration))
                .build();
        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * Validate and rotate a refresh token.
     * The old token is revoked and a new one is issued (rotation policy).
     * If a revoked token is reused, all user tokens are revoked (theft detection).
     */
    @Transactional
    public RefreshToken rotateRefreshToken(String tokenStr) {
        RefreshToken existing = refreshTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));

        // If token was already revoked → possible theft! Revoke ALL user tokens
        if (existing.isRevoked()) {
            refreshTokenRepository.revokeAllByUserId(existing.getUserId());
            throw new RuntimeException("Refresh token reuse detected — all tokens revoked for security");
        }

        // If token expired
        if (existing.isExpired()) {
            existing.setRevoked(true);
            refreshTokenRepository.save(existing);
            throw new RuntimeException("Refresh token has expired");
        }

        // Revoke the old token
        existing.setRevoked(true);

        // Create new token
        RefreshToken newToken = createRefreshToken(existing.getUserId());
        existing.setReplacedBy(newToken.getToken());
        refreshTokenRepository.save(existing);

        return newToken;
    }

    /**
     * Revoke all refresh tokens for a user (logout / password change).
     */
    @Transactional
    public void revokeAllUserTokens(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    /**
     * Clean up expired/revoked tokens (call via scheduled task).
     */
    @Transactional
    public int cleanupExpiredTokens() {
        return refreshTokenRepository.deleteExpiredAndRevoked(Instant.now());
    }

    /**
     * Get JWT access token expiration in milliseconds.
     */
    public long getAccessTokenExpiration() {
        return jwtExpiration;
    }
}
