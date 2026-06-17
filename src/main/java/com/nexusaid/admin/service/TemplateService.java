package com.nexusaid.admin.service;

import com.nexusaid.admin.dto.CreateTemplateStructureRequest;
import com.nexusaid.admin.dto.TemplateBlockDto;
import com.nexusaid.admin.dto.TemplateCreateRequest;
import com.nexusaid.admin.dto.TemplateResponse;
import com.nexusaid.admin.entity.Template;
import com.nexusaid.admin.entity.TemplateBlock;
import com.nexusaid.admin.entity.enums.TemplateScope;
import com.nexusaid.admin.entity.enums.VisibilityScope;
import com.nexusaid.admin.repository.TemplateBlockRepository;
import com.nexusaid.admin.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final TemplateBlockRepository blockRepository;

    @Transactional
    public TemplateResponse createTemplate(TemplateCreateRequest request, UUID userId) {
        Template template = Template.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .createdBy(userId)
                .creatorRole(request.getSelectedRole())
                .creatorCommitteeId(request.getSelectedCommitteeId())
                .visibilityScope(request.getVisibilityScope())
                .isActive(true)
                .version(1)
                .build();

        // Map blocks
        for (TemplateBlockDto blockDto : request.getBlocks()) {
            TemplateBlock block = TemplateBlock.builder()
                    .blockType(blockDto.getBlockType())
                    .positionOrder(blockDto.getPositionOrder())
                    .config(blockDto.getConfig())
                    .isSensitive(blockDto.getIsSensitive() != null ? blockDto.getIsSensitive() : false)
                    .isRequired(blockDto.getIsRequired() != null ? blockDto.getIsRequired() : true)
                    .label(blockDto.getLabel())
                    .build();
            template.addBlock(block);
        }

        Template saved = templateRepository.save(template);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public TemplateResponse getTemplate(UUID id) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        return mapToResponse(template);
    }

    @Transactional(readOnly = true)
    // Basic visibility filter - in production, this queries MS1 for user's full
    // hierarchy
    public List<TemplateResponse> getVisibleTemplates(UUID userId, String role, UUID committeeId) {
        // If Secrétaire Général, can see ALL templates
        if ("SECRETAIRE_GENERAL".equals(role) || "PRESIDENT".equals(role)) {
            return templateRepository.findByIsActiveTrue().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        // Otherwise return templates they created + templates scoped to ALL
        // (Full hierarchical filtering requires MS1 API call, implemented in Phase 5)
        List<Template> templates = templateRepository.findByVisibilityScopeAndIsActiveTrue(VisibilityScope.ALL);
        templates.addAll(templateRepository.findByCreatedByAndIsActiveTrue(userId));

        return templates.stream().distinct().map(this::mapToResponse).collect(Collectors.toList());
    }

    private TemplateResponse mapToResponse(Template template) {
        List<TemplateBlockDto> blockDtos = template.getBlocks().stream()
                .map(block -> TemplateBlockDto.builder()
                        .id(block.getId().toString())
                        .blockType(block.getBlockType())
                        .positionOrder(block.getPositionOrder())
                        .config(block.getConfig())
                        .isSensitive(block.getIsSensitive())
                        .isRequired(block.getIsRequired())
                        .label(block.getLabel())
                        .build())
                .collect(Collectors.toList());

        return TemplateResponse.builder()
                .id(template.getId())
                .title(template.getTitle())
                .description(template.getDescription())
                .createdBy(template.getCreatedBy())
                .creatorRole(template.getCreatorRole())
                .creatorCommitteeId(template.getCreatorCommitteeId())
                .visibilityScope(template.getVisibilityScope())
                .version(template.getVersion())
                .isActive(template.getIsActive())
                .blocks(blockDtos)
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    // ── v2 methods ────────────────────────────────────────────────────────────

    /**
     * Creates a template "header" record for v2 (structure lives in TemplateVersion).
     */
    @Transactional
    public TemplateResponse createTemplateV2(CreateTemplateStructureRequest request, UUID userId) {
        Template template = Template.builder()
                .title(request.title())
                .description(request.description())
                .createdBy(userId)
                .creatorRole("UNKNOWN")            // resolved from JWT by caller
                .creatorCommitteeId(UUID.randomUUID()) // placeholder — set by caller if needed
                .visibilityScope(VisibilityScope.ALL)
                .scope(request.scope())
                .isBaseTemplate(request.isBaseTemplate())
                .isActive(true)
                .version(1)
                .build();
        return mapToResponse(templateRepository.save(template));
    }

    /**
     * Validates that the current user's role is allowed to create a template of the given scope.
     * Throws AccessDeniedException if unauthorized.
     */
    public void validateScopePermission(TemplateScope scope, String role) {
        boolean allowed = switch (scope) {
            case NATIONAL -> role.contains("PRESIDENT") || role.contains("SG") || role.contains("SECRETAIRE_GENERAL");
            case REGIONAL -> role.contains("PRESIDENT") || role.contains("VP") || role.contains("VICE_PRESIDENT");
            case LOCAL    -> true; // any authenticated user can create LOCAL templates
        };
        if (!allowed) {
            throw new AccessDeniedException(
                    "Role [" + role + "] is not authorized to create " + scope + " scope templates.");
        }
    }
}
