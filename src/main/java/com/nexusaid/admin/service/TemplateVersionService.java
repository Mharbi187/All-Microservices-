package com.nexusaid.admin.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexusaid.admin.entity.Template;
import com.nexusaid.admin.entity.TemplateVersion;
import com.nexusaid.admin.repository.TemplateRepository;
import com.nexusaid.admin.repository.TemplateVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages the lifecycle of template versions.
 *
 * Design decisions:
 * - Versions are always created as DRAFT (isPublished=false).
 * - publish() makes a version immutable and available for report creation.
 * - Reports are pinned to a specific version — they never auto-upgrade.
 */
@Service
@RequiredArgsConstructor
public class TemplateVersionService {

    private final TemplateVersionRepository versionRepository;
    private final TemplateRepository templateRepository;
    private final TemplateVersionAuditService auditService;

    /**
     * Updates the existing DRAFT version, or creates a new one if no DRAFT exists.
     * The version number is auto-incremented only when creating a new draft.
     */
    @Transactional
    public TemplateVersion saveOrUpdateDraft(UUID templateId, JsonNode structure, String changeSummary, UUID createdBy) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Template not found: " + templateId));

        // Find existing DRAFT
        List<TemplateVersion> drafts = versionRepository.findByTemplateIdAndStatus(templateId, "DRAFT");
        
        TemplateVersion draft;
        if (!drafts.isEmpty()) {
            draft = drafts.get(0);
            draft.setStructure(structure);
            if (changeSummary != null && !changeSummary.isEmpty()) {
                draft.setChangeSummary(changeSummary);
            }
            draft = versionRepository.save(draft);
            auditService.log(draft, "UPDATED", createdBy);
        } else {
            int nextVersion = versionRepository.countByTemplateId(templateId) + 1;
            draft = TemplateVersion.builder()
                    .template(template)
                    .versionNumber(nextVersion)
                    .structure(structure)
                    .changeSummary(changeSummary)
                    .createdBy(createdBy)
                    .status("DRAFT")
                    .build();
            draft = versionRepository.save(draft);
            auditService.log(draft, "CREATED", createdBy);
        }

        return draft;
    }

    /**
     * Publishes a draft version, making it immutable and available for report creation.
     */
    @Transactional
    public TemplateVersion publish(UUID versionId, UUID publishedBy) {
        TemplateVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("TemplateVersion not found: " + versionId));

        if (!"DRAFT".equals(version.getStatus())) {
            throw new IllegalStateException("Version [" + versionId + "] is already published or archived.");
        }

        version.setStatus("PUBLISHED");
        TemplateVersion saved = versionRepository.save(version);
        auditService.log(saved, "PUBLISHED", publishedBy);
        return saved;
    }

    /**
     * Returns the latest published version for the given template.
     * This is what gets pinned to new reports.
     */
    @Transactional(readOnly = true)
    public TemplateVersion getLatestPublished(UUID templateId) {
        return versionRepository.findLatestPublished(templateId)
                .orElseThrow(() -> new RuntimeException(
                        "No published version found for template: " + templateId +
                        ". Please publish a version before creating reports."));
    }

    /**
     * Full version history — both draft and published, in ascending order.
     */
    @Transactional(readOnly = true)
    public List<TemplateVersion> getVersionHistory(UUID templateId) {
        return versionRepository.findByTemplateIdOrderByVersionNumberAsc(templateId);
    }
}
