package com.nexusaid.admin.dto;

import java.util.UUID;

/**
 * Request DTO for saving a digital signature.
 * The reportId must match an existing report in SUBMITTED or VALIDATED state.
 * imageBase64 is the base64-encoded PNG of the drawn signature.
 * NOTE: userId and signerRole are NOT trusted from this request — they are extracted from the JWT.
 */
public record SaveSignatureRequest(
        UUID reportId,
        String imageBase64  // base64 PNG, optionally prefixed with "data:image/png;base64,"
) {}
