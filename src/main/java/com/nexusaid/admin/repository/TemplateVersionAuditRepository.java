package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.TemplateVersionAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TemplateVersionAuditRepository extends JpaRepository<TemplateVersionAudit, UUID> {
    List<TemplateVersionAudit> findByTemplateVersionIdOrderByTimestampDesc(UUID templateVersionId);
}
