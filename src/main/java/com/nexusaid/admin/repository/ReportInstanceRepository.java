package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.ReportInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportInstanceRepository extends JpaRepository<ReportInstance, UUID> {
    List<ReportInstance> findByFilledBy(UUID filledBy);

    List<ReportInstance> findByTemplateId(UUID templateId);

    List<ReportInstance> findByWorkflowStatus(String workflowStatus);
}
