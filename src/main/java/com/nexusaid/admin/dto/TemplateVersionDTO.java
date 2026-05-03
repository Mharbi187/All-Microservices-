package com.nexusaid.admin.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexusaid.admin.entity.TemplateVersion;

import java.time.Instant;
import java.util.UUID;

public record TemplateVersionDTO(
        UUID id,
        UUID templateId,
        int versionNumber,
        JsonNode structure,
        String changeSummary,
        UUID createdBy,
        Instant createdAt,
        String status
) {
    public static TemplateVersionDTO from(TemplateVersion v) {
        return new TemplateVersionDTO(
                v.getId(),
                v.getTemplate().getId(),
                v.getVersionNumber(),
                v.getStructure(),
                v.getChangeSummary(),
                v.getCreatedBy(),
                v.getCreatedAt(),
                v.getStatus()
        );
    }
}
