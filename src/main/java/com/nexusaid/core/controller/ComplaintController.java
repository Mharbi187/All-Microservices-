package com.nexusaid.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusaid.core.dto.complaint.ComplaintCreateDto;
import com.nexusaid.core.dto.complaint.ComplaintDto;
import com.nexusaid.core.dto.complaint.ComplaintStatusUpdateDto;
import com.nexusaid.core.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;
    private final ObjectMapper objectMapper;

    @PostMapping
    @PreAuthorize("!hasAnyRole('PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL')")
    public ResponseEntity<ComplaintDto> createComplaint(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) throws IOException {
        
        ComplaintCreateDto createDto = objectMapper.readValue(dataJson, ComplaintCreateDto.class);
        return ResponseEntity.ok(complaintService.createComplaint(createDto, files));
    }

    @GetMapping("/my-complaints")
    public ResponseEntity<List<ComplaintDto>> getMyComplaints() {
        return ResponseEntity.ok(complaintService.getMyComplaints());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComplaintDto> getComplaintById(@PathVariable UUID id) {
        return ResponseEntity.ok(complaintService.getComplaintById(id));
    }

    @GetMapping("/committee/{committeeId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'PRESIDENT_REGIONAL', 'VICE_PRESIDENT_REGIONAL', 'PRESIDENT_LOCAL', 'VICE_PRESIDENT_LOCAL')")
    public ResponseEntity<List<ComplaintDto>> getComplaintsByTargetCommittee(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(complaintService.getComplaintsByTargetCommittee(committeeId));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL')")
    public ResponseEntity<List<ComplaintDto>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'PRESIDENT_REGIONAL', 'VICE_PRESIDENT_REGIONAL', 'PRESIDENT_LOCAL', 'VICE_PRESIDENT_LOCAL')")
    public ResponseEntity<ComplaintDto> updateComplaintStatus(
            @PathVariable UUID id,
            @RequestBody ComplaintStatusUpdateDto updateDto) {
        return ResponseEntity.ok(complaintService.updateComplaintStatus(id, updateDto));
    }

    @PostMapping("/{id}/responses")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'PRESIDENT_REGIONAL', 'VICE_PRESIDENT_REGIONAL', 'PRESIDENT_LOCAL', 'VICE_PRESIDENT_LOCAL')")
    public ResponseEntity<ComplaintDto> addResponse(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(complaintService.addResponse(id, payload.get("message")));
    }

    @GetMapping("/{id}/view")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'PRESIDENT_REGIONAL', 'VICE_PRESIDENT_REGIONAL', 'PRESIDENT_LOCAL', 'VICE_PRESIDENT_LOCAL')")
    public ResponseEntity<ComplaintDto> viewComplaint(@PathVariable UUID id) {
        return ResponseEntity.ok(complaintService.viewComplaint(id));
    }
}
