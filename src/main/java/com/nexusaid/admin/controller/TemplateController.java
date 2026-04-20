package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.TemplateCreateRequest;
import com.nexusaid.admin.dto.TemplateResponse;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.TemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @PostMapping
    public ResponseEntity<TemplateResponse> createTemplate(
            @Valid @RequestBody TemplateCreateRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        TemplateResponse response = templateService.createTemplate(request, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TemplateResponse> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(templateService.getTemplate(id));
    }

    @GetMapping
    public ResponseEntity<List<TemplateResponse>> getVisibleTemplates(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) UUID committeeId) {

        String effectiveRole = role != null ? role : "UNKNOWN";
        UUID effectiveCommitteeId = committeeId != null ? committeeId : UUID.randomUUID(); // Fallback for filtering

        return ResponseEntity.ok(templateService.getVisibleTemplates(userDetails.getUser().getId(), effectiveRole,
                effectiveCommitteeId));
    }
}
