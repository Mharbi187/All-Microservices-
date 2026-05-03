package com.nexusaid.core.dto.complaint;

import com.nexusaid.core.entity.enums.ComplaintStatus;
import com.nexusaid.core.entity.enums.ComplaintVisibility;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ComplaintDto {
    private UUID id;
    private String subject;
    private String message;
    private ComplaintVisibility visibility;
    private ComplaintStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Submitter Info (will be null if visibility is ANONYMOUS and requester is not the submitter)
    private UUID submitterId;
    private String submitterName;

    // Target Committee Info
    private UUID targetCommitteeId;
    private String targetCommitteeName;

    private List<ComplaintAttachmentDto> attachments;
    private List<ComplaintResponseDto> responses;
}
