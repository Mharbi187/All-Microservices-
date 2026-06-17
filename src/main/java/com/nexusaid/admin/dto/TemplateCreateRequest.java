package com.nexusaid.admin.dto;

import com.nexusaid.admin.entity.enums.VisibilityScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TemplateCreateRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Visibility scope is required")
    private VisibilityScope visibilityScope;

    @NotBlank(message = "Selected role is required")
    private String selectedRole;

    @NotNull(message = "Selected committee ID is required")
    private java.util.UUID selectedCommitteeId;

    @NotEmpty(message = "At least one block is required")
    @Valid
    private List<TemplateBlockDto> blocks;
}
