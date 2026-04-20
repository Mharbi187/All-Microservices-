package com.nexusaid.core.repository;

import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.entity.enums.RoleTitle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommitteeRoleRepository extends JpaRepository<CommitteeRole, UUID> {
    List<CommitteeRole> findByCommitteeId(UUID committeeId);

    List<CommitteeRole> findByVolunteerId(UUID volunteerId);

    Optional<CommitteeRole> findByCommitteeIdAndTitle(UUID committeeId, RoleTitle title);

    Optional<CommitteeRole> findByCommitteeIdAndVolunteerIdAndTitle(UUID committeeId, UUID volunteerId,
            RoleTitle title);

    boolean existsByCommitteeIdAndTitleAndVolunteerId(UUID committeeId, RoleTitle title, UUID volunteerId);

    List<CommitteeRole> findByStatus(CommitteeRoleStatus status);

    List<CommitteeRole> findByCommitteeIdAndStatus(UUID committeeId, CommitteeRoleStatus status);

    List<CommitteeRole> findByCommitteeIdInAndStatus(List<UUID> committeeIds, CommitteeRoleStatus status);

    /** Trouver les rôles dont le mandat est expiré */
    @Query("SELECT r FROM CommitteeRole r WHERE r.mandateEndDate IS NOT NULL AND r.mandateEndDate < :today")
    List<CommitteeRole> findExpiredMandates(LocalDate today);

    /**
     * Vérifier l'existence d'un rôle unique dans un comité (ex: un seul PRESIDENT)
     */
    boolean existsByCommitteeIdAndTitle(UUID committeeId, RoleTitle title);

    /** Compter les rôles obligatoires pour un comité (PRESIDENT + SG) */
    @Query("SELECT COUNT(r) FROM CommitteeRole r WHERE r.committee.id = :committeeId AND r.title IN ('PRESIDENT', 'SECRETAIRE_GENERAL')")
    long countMandatoryRoles(UUID committeeId);
}
