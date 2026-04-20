package com.nexusaid.core.repository.domains.immigration;

import com.nexusaid.core.entity.domains.immigration.IntegrationTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IntegrationTrackingRepository extends JpaRepository<IntegrationTracking, UUID> {
    Optional<IntegrationTracking> findByMigrantCaseId(UUID migrantCaseId);
}
