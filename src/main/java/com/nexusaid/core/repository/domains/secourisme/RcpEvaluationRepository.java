package com.nexusaid.core.repository.domains.secourisme;

import com.nexusaid.core.entity.domains.secourisme.RcpEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RcpEvaluationRepository extends JpaRepository<RcpEvaluation, UUID> {

    List<RcpEvaluation> findByCommitteeIdOrderByCreatedAtDesc(UUID committeeId);

    List<RcpEvaluation> findByTrainerIdOrderByCreatedAtDesc(UUID trainerId);

    List<RcpEvaluation> findByCommitteeIdInOrderByCreatedAtDesc(List<UUID> committeeIds);

    long countByCommitteeId(UUID committeeId);

    @Query("SELECT DISTINCT e.committee.id FROM RcpEvaluation e")
    List<UUID> findDistinctCommitteeIds();
}
