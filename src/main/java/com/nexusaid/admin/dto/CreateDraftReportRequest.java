package com.nexusaid.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request to create a new DRAFT report from a specific published template version.
 * The templateVersionId is chosen explicitly by the user — never auto-resolved.
 */
public record CreateDraftReportRequest(
        @NotNull UUID templateVersionId,
        @NotBlank String title,
        @NotBlank String reportLevel,  // e.g. NORMAL, URGENT
        UUID assignedTo
) {}
