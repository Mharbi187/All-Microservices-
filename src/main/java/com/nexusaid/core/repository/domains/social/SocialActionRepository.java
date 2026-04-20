package com.nexusaid.core.repository.domains.social;

import com.nexusaid.core.entity.domains.social.SocialAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SocialActionRepository extends JpaRepository<SocialAction, UUID> {
    List<SocialAction> findByFamilyId(UUID familyId);
}
