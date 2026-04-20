package com.nexusaid.core.repository.domains.immigration;

import com.nexusaid.core.entity.domains.immigration.MigrantCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MigrantCaseRepository extends JpaRepository<MigrantCase, UUID> {
    List<MigrantCase> findByAssignedVolunteerId(UUID volunteerId);
    List<MigrantCase> findByCurrentStatus(String status);
}
