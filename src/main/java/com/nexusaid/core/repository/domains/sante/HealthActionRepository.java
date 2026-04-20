package com.nexusaid.core.repository.domains.sante;

import com.nexusaid.core.entity.domains.sante.HealthAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HealthActionRepository extends JpaRepository<HealthAction, UUID> {
    List<HealthAction> findByCommitteeId(UUID committeeId);
    List<HealthAction> findByStatus(String status);
}
