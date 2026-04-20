package com.nexusaid.core.controller;

import com.nexusaid.core.entity.Complaint;
import com.nexusaid.core.entity.enums.ComplaintStatus;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/profiles/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;

    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/my-complaints")
    public ResponseEntity<List<Complaint>> getMyComplaints(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(complaintService.getComplaintsByComplainant(userDetails.getUser().getId()));
    }

    @PostMapping
    public ResponseEntity<Complaint> submitComplaint(
            @RequestBody Complaint request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        // Use the authenticated user's ID as the complainant
        UUID complainantId = userDetails.getUser().getId();
        String complainantType = userDetails.getUser().getType().name();
        
        return ResponseEntity.ok(complaintService.submitComplaint(complainantId, complainantType, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Complaint> updateComplaintStatus(
            @PathVariable UUID id,
            @RequestParam ComplaintStatus newStatus) {
        // Typically requires specific roles to update status, omitted for brevity
        return ResponseEntity.ok(complaintService.updateComplaintStatus(id, newStatus));
    }
}
