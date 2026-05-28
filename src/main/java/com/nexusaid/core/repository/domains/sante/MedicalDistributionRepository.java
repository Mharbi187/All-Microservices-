package com.nexusaid.core.repository.domains.sante;

import com.nexusaid.core.entity.domains.sante.MedicalDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalDistributionRepository extends JpaRepository<MedicalDistribution, UUID> {
    List<MedicalDistribution> findByCommitteeIdOrderByRequestedAtDesc(UUID committeeId);
    List<MedicalDistribution> findByStatusOrderByRequestedAtDesc(String status);
    List<MedicalDistribution> findByCommitteeIdAndStatusOrderByRequestedAtDesc(UUID committeeId, String status);
    List<MedicalDistribution> findAllByOrderByRequestedAtDesc();
}
