package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.TemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TemplateVersionRepository extends JpaRepository<TemplateVersion, UUID> {

    List<TemplateVersion> findByTemplateIdOrderByVersionNumberAsc(UUID templateId);

    /** The latest published version for a given template */
    @Query("SELECT tv FROM TemplateVersion tv WHERE tv.template.id = :templateId " +
           "AND tv.status = 'PUBLISHED' ORDER BY tv.versionNumber DESC LIMIT 1")
    Optional<TemplateVersion> findLatestPublished(UUID templateId);

    /** Count of all versions for a template (to compute next version number) */
    int countByTemplateId(UUID templateId);

    List<TemplateVersion> findByTemplateIdAndStatus(UUID templateId, String status);
}
