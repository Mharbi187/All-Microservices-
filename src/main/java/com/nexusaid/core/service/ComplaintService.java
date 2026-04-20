package com.nexusaid.core.service;

import com.nexusaid.core.entity.Complaint;
import com.nexusaid.core.entity.enums.ComplaintStatus;
import com.nexusaid.core.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintService {

    private final ComplaintRepository complaintRepository;

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    public List<Complaint> getComplaintsByComplainant(UUID complainantId) {
        return complaintRepository.findByComplainantId(complainantId);
    }

    @Transactional
    public Complaint submitComplaint(UUID complainantId, String complainantType, Complaint complaintRequest) {
        Complaint complaint = Complaint.builder()
                .complainantId(complainantId)
                .complainantType(complainantType)
                .subject(complaintRequest.getSubject())
                .description(complaintRequest.getDescription())
                .photoUrls(complaintRequest.getPhotoUrls())
                .location(complaintRequest.getLocation())
                .status(ComplaintStatus.PENDING)
                .build();
        return complaintRepository.save(complaint);
    }

    @Transactional
    public Complaint updateComplaintStatus(UUID complaintId, ComplaintStatus newStatus) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        complaint.setStatus(newStatus);
        return complaintRepository.save(complaint);
    }
}
