package com.nexusaid.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ReportSubmitRequest {

    @NotNull(message = "Template ID is required")
    private UUID templateId;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Report Level is required (Urgent, Normal, etc.)")
    private String reportLevel;

    @NotEmpty(message = "Blocks data cannot be empty")
    @Valid
    private List<ReportBlockSubmitDto> blocks;
}
