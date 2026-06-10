package com.nexusaid.core.service.domains.diffusion;

import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.domains.diffusion.AwarenessCampaign;
import com.nexusaid.core.entity.domains.diffusion.EducationalResource;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.repository.CommitteeRoleRepository;
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
    private final CommitteeRoleRepository roleRepository;

    private boolean isPresident(UUID userId) {
        return roleRepository.findByVolunteerId(userId).stream()
                .anyMatch(r -> r.getStatus() == CommitteeRoleStatus.APPROVED 
                        && r.getTitle() == RoleTitle.PRESIDENT);
    }

    @Transactional(readOnly = true)
    public List<EducationalResource> getAllResources() {
        return resourceRepository.findAll();
    }

    @Transactional
    public EducationalResource createResource(EducationalResource resource, UUID creatorId) {
        resource.setCreatedBy(creatorId);
        resource.setCreatedAt(LocalDateTime.now());
        if (isPresident(creatorId)) {
            resource.setStatus("PUBLIE");
        } else {
            resource.setStatus("EN_ATTENTE");
        }
        return resourceRepository.save(resource);
    }

    @Transactional(readOnly = true)
    public List<AwarenessCampaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }

    @Transactional
    public AwarenessCampaign createCampaign(AwarenessCampaign campaign, UUID creatorId) {
        campaign.setCreatedBy(creatorId);
        if (isPresident(creatorId)) {
            campaign.setStatus("PUBLIE");
        } else {
            campaign.setStatus("EN_ATTENTE");
        }
        return campaignRepository.save(campaign);
    }

    @Transactional
    public AwarenessCampaign updateCampaignStatus(UUID id, String status) {
        return campaignRepository.findById(id).map(c -> {
            c.setStatus(status);
            return campaignRepository.save(c);
        }).orElseThrow(() -> new RuntimeException("Campaign not found: " + id));
    }

    @Transactional
    public EducationalResource updateResourceStatus(UUID id, String status) {
        return resourceRepository.findById(id).map(r -> {
            r.setStatus(status);
            return resourceRepository.save(r);
        }).orElseThrow(() -> new RuntimeException("Resource not found: " + id));
    }
}
