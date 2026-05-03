package com.nexusaid.core.dto.complaint;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ComplaintAttachmentDto {
    private UUID id;
    private String fileName;
    private String fileUrl;
    private String fileType;
}
