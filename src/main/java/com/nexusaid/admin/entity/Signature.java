package com.nexusaid.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Digital signature bound to a specific report and signer identity.
 * The bindingHash cryptographically links the image to the JWT-verified user identity.
 */
@Entity
@Table(name = "signatures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Signature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    /** Taken from JWT — cannot be spoofed by the client */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** MinIO object key, e.g. signatures/{id}.png */
    @Column(name = "image_url", length = 512)
    private String imageUrl;

    /** SHA-256 of the raw image bytes */
    @Column(name = "image_hash", nullable = false, length = 64)
    private String imageHash;

    /**
     * SHA-256( imageHash + userId + reportId + signedAt ).
     * Binds the image cryptographically to the authenticated JWT identity.
     */
    @Column(name = "binding_hash", nullable = false, length = 64)
    private String bindingHash;

    /** Taken from JWT authorities — cannot be spoofed */
    @Column(name = "signer_role", length = 100)
    private String signerRole;

    @Column(name = "signed_at", nullable = false)
    @Builder.Default
    private Instant signedAt = Instant.now();

    @Column(name = "verified", nullable = false)
    @Builder.Default
    private Boolean verified = false;
}
