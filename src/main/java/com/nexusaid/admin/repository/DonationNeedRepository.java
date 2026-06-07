package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonationNeedRepository extends JpaRepository<DonationNeed, UUID> {

    // ─── Requêtes de base ──────────────────────────────────────────────────────

    List<DonationNeed> findByStatus(NeedsStatus status);

    List<DonationNeed> findByCommitteeIdAndStatus(UUID committeeId, NeedsStatus status);

    List<DonationNeed> findByCreatedBy(UUID userId);

    List<DonationNeed> findByCreatedByAndStatus(UUID userId, NeedsStatus status);

    // ─── Accès hiérarchique (liste de comités autorisés) ──────────────────────

    List<DonationNeed> findByCommitteeIdIn(List<UUID> committeeIds);

    List<DonationNeed> findByCommitteeIdInAndStatus(List<UUID> committeeIds, NeedsStatus status);

    Page<DonationNeed> findByCommitteeIdInAndStatus(
            List<UUID> committeeIds, NeedsStatus status, Pageable pageable);

    Page<DonationNeed> findByCommitteeIdIn(List<UUID> committeeIds, Pageable pageable);

    // ─── Statistiques ──────────────────────────────────────────────────────────

    long countByCommitteeIdInAndStatus(List<UUID> committeeIds, NeedsStatus status);

    long countByStatus(NeedsStatus status);

    @Query("SELECT COALESCE(SUM(d.currentAmount), 0) FROM DonationNeed d WHERE d.committeeId IN :committeeIds AND d.status = 'VALIDATED'")
    java.math.BigDecimal sumCurrentAmountByCommitteeIds(@Param("committeeIds") List<UUID> committeeIds);

    // ─── Contrôle auto-validation ──────────────────────────────────────────────

    /** Vérifie si le créateur est le même que le valideur (doit retourner false) */
    boolean existsByIdAndCreatedBy(UUID id, UUID userId);
}
