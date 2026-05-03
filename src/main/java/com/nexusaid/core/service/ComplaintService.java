package com.nexusaid.core.service;

import com.nexusaid.core.dto.complaint.ComplaintCreateDto;
import com.nexusaid.core.dto.complaint.ComplaintDto;
import com.nexusaid.core.dto.complaint.ComplaintStatusUpdateDto;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

public interface ComplaintService {
    ComplaintDto createComplaint(ComplaintCreateDto dto, List<MultipartFile> files);
    List<ComplaintDto> getMyComplaints();
    List<ComplaintDto> getComplaintsByTargetCommittee(UUID committeeId);
    List<ComplaintDto> getAllComplaints(); // For national level
    ComplaintDto updateComplaintStatus(UUID complaintId, ComplaintStatusUpdateDto updateDto);
    ComplaintDto addResponse(UUID complaintId, String message);
    ComplaintDto getComplaintById(UUID complaintId);
}
