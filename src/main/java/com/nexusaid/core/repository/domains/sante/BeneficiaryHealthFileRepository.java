package com.nexusaid.core.repository.domains.sante;

import com.nexusaid.core.entity.domains.sante.BeneficiaryHealthFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BeneficiaryHealthFileRepository extends JpaRepository<BeneficiaryHealthFile, UUID> {
    List<BeneficiaryHealthFile> findByInterventionId(UUID interventionId);
}
