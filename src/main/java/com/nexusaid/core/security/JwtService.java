package com.nexusaid.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
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

    @Value("${security.jwt.expiration}")
    private long jwtExpiration;

    private PrivateKey privateKey;
    private java.security.PublicKey publicKey;

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
}
