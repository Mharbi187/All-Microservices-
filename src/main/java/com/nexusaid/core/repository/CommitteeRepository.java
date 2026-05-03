package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.enums.CommitteeStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommitteeRepository extends JpaRepository<Committee, UUID> {

    List<Committee> findByParentCommitteeId(UUID parentId);

    long countByType(CommitteeType type);

    boolean existsByTypeAndRegion(CommitteeType type, String region);

    // ─── Cascade selection for registration ──────────────────────────────────

    /** All REGIONAL committees for a given gouvernorat (= region field) */
    List<Committee> findByTypeAndRegionContainingIgnoreCaseAndStatus(
            CommitteeType type, String region, CommitteeStatus status);

    /** All REGIONAL committees — for listing all gouvernorats */
    List<Committee> findByTypeAndStatus(CommitteeType type, CommitteeStatus status);

    /** Sub-committees (LOCAL) under a given parent */
    List<Committee> findByParentCommitteeIdAndStatus(UUID parentId, CommitteeStatus status);

    /** All committees by region (gouvernorat) */
    @Query("SELECT c FROM Committee c WHERE LOWER(c.region) LIKE LOWER(CONCAT('%', :gov, '%')) AND c.status = 'ACTIVE'")
    List<Committee> findActiveByGouvernorat(@Param("gov") String gouvernorat);

    /** Distinct gouvernorats from REGIONAL committees */
    @Query("SELECT DISTINCT c.region FROM Committee c WHERE c.type = 'REGIONAL' AND c.status = 'ACTIVE' ORDER BY c.region")
    List<String> findAllActiveGouvernorats();
}
