package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Committee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommitteeRepository extends JpaRepository<Committee, UUID> {
    List<Committee> findByParentCommitteeId(UUID parentId);

    long countByType(com.nexusaid.core.entity.enums.CommitteeType type);

    boolean existsByTypeAndRegion(com.nexusaid.core.entity.enums.CommitteeType type, String region);
}
