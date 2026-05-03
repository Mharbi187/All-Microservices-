package com.nexusaid.admin.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request to update the filledData of a DRAFT report (autosave).
 * The reportId comes from the URL path variable, not this body.
 */
public record UpdateFilledDataRequest(
        @NotNull JsonNode filledData
) {}
