package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Trainer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TrainerRepository extends JpaRepository<Trainer, UUID> {

    List<Trainer> findByCommitteeId(UUID committeeId);

    @Query("SELECT t FROM Trainer t WHERE t.committeeId IN :committeeIds")
    List<Trainer> findByCommitteeIdIn(List<UUID> committeeIds);

    /** Used by Secourisme expiry scheduler */
    @Query("SELECT t FROM Trainer t WHERE t.promotedAt IS NOT NULL AND t.promotedAt < :cutoff")
    List<Trainer> findByPromotedAtBefore(LocalDateTime cutoff);
}

