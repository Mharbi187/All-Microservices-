package com.nexusaid.core.dto.complaint;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ComplaintResponseDto {
    private UUID id;
    private String message;
    private LocalDateTime createdAt;
    // Responder details
    private UUID responderId;
    private String responderName;
    private String responderAvatar;
}
