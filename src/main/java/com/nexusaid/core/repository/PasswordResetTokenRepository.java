package com.nexusaid.core.repository;

import com.nexusaid.core.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByToken(String token);

    /** Remove any existing tokens for this email before issuing a new one. */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.email = :email")
    void deleteByEmail(String email);

    /** Cleanup job: delete all expired tokens. */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now")
    void deleteByExpiresAtBefore(LocalDateTime now);
}
