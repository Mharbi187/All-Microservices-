package com.nexusaid.admin.security;

import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.repository.DonationNeedRepository;
import com.nexusaid.admin.service.CommitteeHierarchyService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.UUID;

@Component("donationSecurity")
@RequiredArgsConstructor
public class DonationSecurity {

    private final DonationNeedRepository donationNeedRepository;
    private final CommitteeHierarchyService hierarchyService;

    public boolean canValidateNeedFor(UUID needId, Authentication auth) {
        DonationNeed need = donationNeedRepository.findById(needId).orElse(null);
        if (need == null) return false;

        // Le créateur ne peut pas s'auto-valider
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        if (need.getCreatedBy().equals(userDetails.getUser().getId())) {
            return false;
        }

        List<UUID> accessibleIds = getAccessibleIds();
        return accessibleIds.contains(need.getCommitteeId());
    }

    public boolean canAccessCommittee(UUID committeeId) {
        List<UUID> accessibleIds = getAccessibleIds();
        return accessibleIds.contains(committeeId);
    }

    private List<UUID> getAccessibleIds() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        String authHeader = request.getHeader("Authorization");
        return hierarchyService.getAccessibleCommitteeIds(authHeader);
    }
}
