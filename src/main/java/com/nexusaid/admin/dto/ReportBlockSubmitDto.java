package com.nexusaid.admin.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ReportBlockSubmitDto {

    @NotNull(message = "Template block ID is required")
    private UUID templateBlockId;

    private String content; // The text or JSON string of options selected

    private String fileUrl; // For uploaded images
}
