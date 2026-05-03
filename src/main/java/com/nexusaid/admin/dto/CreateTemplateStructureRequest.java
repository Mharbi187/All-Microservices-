package com.nexusaid.admin.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexusaid.admin.entity.enums.TemplateScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request for creating a new v2 template with JSONB structure.
 * The structure field defines the initial draft version content.
 */
public record CreateTemplateStructureRequest(
        @NotBlank String title,
        String description,
        @NotNull TemplateScope scope,
        boolean isBaseTemplate,
        String changeSummary,
        JsonNode structure  // optional — can be null for an empty template
) {}
