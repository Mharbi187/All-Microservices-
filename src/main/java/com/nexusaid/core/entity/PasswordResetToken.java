package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores secure password-reset tokens issued via the "Forgot Password" flow.
 * Tokens expire after 60 minutes and are invalidated after first use.
 */
@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The opaque token sent in the reset link. */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    /** The email address this token belongs to. */
    @Column(nullable = false)
    private String email;

    /** When this token expires (60 minutes after creation). */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Whether the token has already been consumed. */
    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
