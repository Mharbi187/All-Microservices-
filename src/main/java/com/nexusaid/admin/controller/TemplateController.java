package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.CreateTemplateStructureRequest;
import com.nexusaid.admin.dto.TemplateCreateRequest;
import com.nexusaid.admin.dto.TemplateResponse;
import com.nexusaid.admin.dto.TemplateVersionDTO;
import com.nexusaid.admin.entity.TemplateVersion;
import com.nexusaid.admin.entity.enums.TemplateScope;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.PdfGenerationService;
import com.nexusaid.admin.service.TemplatePreviewService;
import com.nexusaid.admin.service.TemplateService;
import com.nexusaid.admin.service.TemplateVersionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;
    private final TemplateVersionService versionService;
    private final TemplatePreviewService previewService;
    private final PdfGenerationService pdfGenerationService;

    // ── Legacy block-based template creation ─────────────────────────────────

    @PostMapping("/legacy")
    public ResponseEntity<TemplateResponse> createLegacyTemplate(
            @Valid @RequestBody TemplateCreateRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        TemplateResponse response = templateService.createTemplate(request, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── v2: Scope-guarded template creation ──────────────────────────────────

    @PostMapping("/v2")
    public ResponseEntity<TemplateVersionDTO> createTemplateV2(
            @Valid @RequestBody CreateTemplateStructureRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        UUID userId = userDetails.getUser().getId();
        String role = userDetails.getAuthorities().stream()
                .findFirst().map(a -> a.getAuthority()).orElse("UNKNOWN");

        // Validate scope permission
        templateService.validateScopePermission(request.scope(), role);

        // Create template header
        TemplateResponse template = templateService.createTemplateV2(request, userId);

        // Create initial draft version if structure provided
        TemplateVersionDTO version = null;
        if (request.structure() != null) {
            TemplateVersion tv = versionService.saveOrUpdateDraft(
                    template.getId(), request.structure(), request.changeSummary(), userId);
            version = TemplateVersionDTO.from(tv);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(version);
    }

    // ── Version management ───────────────────────────────────────────────────

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<TemplateVersionDTO>> getVersionHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(
                versionService.getVersionHistory(id).stream()
                        .map(TemplateVersionDTO::from)
                        .toList());
    }

    @PostMapping("/versions/{versionId}/publish")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'SECRETAIRE_GENERAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<TemplateVersionDTO> publishVersion(
            @PathVariable UUID versionId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        TemplateVersion published = versionService.publish(versionId, userDetails.getUser().getId());
        return ResponseEntity.ok(TemplateVersionDTO.from(published));
    }

    @PostMapping("/{id}/versions/draft")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'SECRETAIRE_GENERAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT')")
    public ResponseEntity<TemplateVersionDTO> createDraftVersion(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode structure = mapper.valueToTree(body.get("structure"));
        String changeSummary = (String) body.get("changeSummary");

        TemplateVersion version = versionService.saveOrUpdateDraft(
                id, structure, changeSummary, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TemplateVersionDTO.from(version));
    }

    @GetMapping("/{id}/versions/{versionId}/export-pdf")
    public ResponseEntity<byte[]> exportVersionPdf(
            @PathVariable UUID id,
            @PathVariable UUID versionId) {

        TemplateVersion version = versionService.getVersionHistory(id).stream()
                .filter(v -> v.getId().equals(versionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Version not found"));

        String html = previewService.renderToHtml(version.getStructure());
        byte[] pdfBytes = pdfGenerationService.generateFromHtml(html);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"template-" + id + "-v" + version.getVersionNumber() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    // ── Read endpoints ───────────────────────────────────────────────────────

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
        UUID effectiveCommitteeId = committeeId != null ? committeeId : UUID.randomUUID();
        return ResponseEntity.ok(templateService.getVisibleTemplates(
                userDetails.getUser().getId(), effectiveRole, effectiveCommitteeId));
    }

    // ── Preview endpoint ─────────────────────────────────────────────────────

    @PostMapping("/preview")
    public ResponseEntity<String> preview(@RequestBody com.fasterxml.jackson.databind.JsonNode structure) {
        String html = previewService.renderToHtml(structure);
        return ResponseEntity.ok(html);
    }
}
