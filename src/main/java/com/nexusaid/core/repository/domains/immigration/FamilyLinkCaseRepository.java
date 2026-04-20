package com.nexusaid.core.repository.domains.immigration;

import com.nexusaid.core.entity.domains.immigration.FamilyLinkCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FamilyLinkCaseRepository extends JpaRepository<FamilyLinkCase, UUID> {
    List<FamilyLinkCase> findByRequesterId(UUID requesterId);
    List<FamilyLinkCase> findByStatus(String status);
}
