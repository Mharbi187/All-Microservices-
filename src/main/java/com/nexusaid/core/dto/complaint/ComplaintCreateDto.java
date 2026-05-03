package com.nexusaid.core.dto.complaint;

import com.nexusaid.core.entity.enums.ComplaintVisibility;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ComplaintCreateDto {
    private String subject;
    private String message;
    private UUID targetCommitteeId;
    private ComplaintVisibility visibility;
}
