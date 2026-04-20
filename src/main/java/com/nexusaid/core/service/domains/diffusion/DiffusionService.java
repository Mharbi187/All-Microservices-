package com.nexusaid.core.service.domains.diffusion;

import com.nexusaid.core.entity.domains.diffusion.AwarenessCampaign;
import com.nexusaid.core.entity.domains.diffusion.EducationalResource;
import com.nexusaid.core.repository.domains.diffusion.AwarenessCampaignRepository;
import com.nexusaid.core.repository.domains.diffusion.EducationalResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DiffusionService {

    private final EducationalResourceRepository resourceRepository;
    private final AwarenessCampaignRepository campaignRepository;

    @Transactional(readOnly = true)
    public List<EducationalResource> getAllResources() {
        return resourceRepository.findAll();
    }

    @Transactional
    public EducationalResource createResource(EducationalResource resource, UUID creatorId) {
        resource.setCreatedBy(creatorId);
        resource.setCreatedAt(LocalDateTime.now());
        return resourceRepository.save(resource);
    }

    @Transactional(readOnly = true)
    public List<AwarenessCampaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }

    @Transactional
    public AwarenessCampaign createCampaign(AwarenessCampaign campaign, UUID creatorId) {
        campaign.setCreatedBy(creatorId);
        return campaignRepository.save(campaign);
    }
}
