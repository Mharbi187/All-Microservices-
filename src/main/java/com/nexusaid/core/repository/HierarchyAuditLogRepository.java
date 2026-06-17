package com.nexusaid.core.repository;

import com.nexusaid.core.entity.HierarchyAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HierarchyAuditLogRepository extends JpaRepository<HierarchyAuditLog, UUID> {
    List<HierarchyAuditLog> findByTargetCommitteeIdOrderByTimestampDesc(UUID committeeId);

    List<HierarchyAuditLog> findByTargetCommitteeIdInOrderByTimestampDesc(List<UUID> committeeIds);
}
