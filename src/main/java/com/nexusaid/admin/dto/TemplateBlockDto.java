package com.nexusaid.admin.dto;

import com.nexusaid.admin.entity.enums.BlockType;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TemplateBlockDto {

    private String id; // Optional, only populated on fetch or update

    @NotNull(message = "Block type is required")
    private BlockType blockType;

    @NotNull(message = "Position order is required")
    private Integer positionOrder;

    @NotNull(message = "Configuration JSON string is required")
    private String config;

    private Boolean isSensitive = false;

    private Boolean isRequired = true;

    private String label;
}
