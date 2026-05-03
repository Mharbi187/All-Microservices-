package com.nexusaid.core.dto.complaint;

import com.nexusaid.core.entity.enums.ComplaintStatus;
import lombok.Data;

@Data
public class ComplaintStatusUpdateDto {
    private ComplaintStatus status;
    private String responseMessage; // optional immediate response message accompanying the status change
}
