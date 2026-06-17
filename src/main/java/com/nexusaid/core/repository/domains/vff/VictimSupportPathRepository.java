package com.nexusaid.core.repository.domains.vff;

import com.nexusaid.core.entity.domains.vff.VictimSupportPath;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VictimSupportPathRepository extends JpaRepository<VictimSupportPath, UUID> {
    Optional<VictimSupportPath> findByVictimCaseId(UUID victimCaseId);
}
