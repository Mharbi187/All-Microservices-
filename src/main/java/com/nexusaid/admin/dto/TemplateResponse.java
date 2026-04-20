package com.nexusaid.admin.dto;

import com.nexusaid.admin.entity.enums.VisibilityScope;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TemplateResponse {
    private UUID id;
    private String title;
    private String description;
    private UUID createdBy;
    private String creatorRole;
    private UUID creatorCommitteeId;
    private VisibilityScope visibilityScope;
    private Integer version;
    private Boolean isActive;
    private List<TemplateBlockDto> blocks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
