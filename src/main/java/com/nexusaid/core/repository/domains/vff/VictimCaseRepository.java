package com.nexusaid.core.repository.domains.vff;

import com.nexusaid.core.entity.domains.vff.VictimCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VictimCaseRepository extends JpaRepository<VictimCase, UUID> {
    Optional<VictimCase> findByCaseReference(String caseReference);
    List<VictimCase> findByAssignedVolunteerId(UUID volunteerId);
}
