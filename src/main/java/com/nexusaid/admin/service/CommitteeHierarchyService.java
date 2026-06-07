package com.nexusaid.admin.service;

import com.nexusaid.admin.client.CoreServiceFeignClient;
import com.nexusaid.admin.security.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommitteeHierarchyService {

    private final CoreServiceFeignClient coreServiceFeignClient;

    public List<UUID> getAccessibleCommitteeIds(String authHeader) {
        return coreServiceFeignClient.getMyAccessibleCommitteeIds(authHeader);
    }

    public List<User> getCommitteePresidents(UUID committeeId, String authHeader) {
        return coreServiceFeignClient.getCommitteePresidents(committeeId, authHeader);
    }
}
