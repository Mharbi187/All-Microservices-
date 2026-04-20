package com.nexusaid.core.repository.domains.diffusion;

import com.nexusaid.core.entity.domains.diffusion.AwarenessCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AwarenessCampaignRepository extends JpaRepository<AwarenessCampaign, UUID> {
    List<AwarenessCampaign> findByTargetPrinciple(String principle);
    List<AwarenessCampaign> findByCreatedBy(UUID creatorId);
}
