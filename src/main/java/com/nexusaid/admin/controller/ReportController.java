package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.CreateDraftReportRequest;
import com.nexusaid.admin.dto.ReportSubmitRequest;
import com.nexusaid.admin.dto.UpdateFilledDataRequest;
import com.nexusaid.admin.entity.ReportAuditLog;
import com.nexusaid.admin.entity.ReportInstance;
import com.nexusaid.admin.repository.ReportInstanceRepository;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.AuditLogService;
import com.nexusaid.admin.service.FileStorageService;
import com.nexusaid.admin.service.ReportSubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportSubmissionService submissionService;
    private final ReportInstanceRepository reportRepository;
    private final AuditLogService auditLogService;
    private final FileStorageService fileStorageService;

    // ── v2: Draft creation ────────────────────────────────────────────────────

    @PostMapping("/draft")
    public ResponseEntity<ReportInstance> createDraft(
            @Valid @RequestBody CreateDraftReportRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        ReportInstance draft = submissionService.createDraftFromVersion(request, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(draft);
    }

    // ── v2: Autosave filled data ──────────────────────────────────────────────

    @PutMapping("/{id}/data")
    @PreAuthorize("@reportSecurity.canEdit(authentication, #id)")
    public ResponseEntity<ReportInstance> updateFilledData(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateFilledDataRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(submissionService.updateFilledData(id, request, userDetails.getUser().getId()));
    }

    // ── v2: Workflow transitions ──────────────────────────────────────────────

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submitReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        submissionService.submitDraftReport(id, userDetails.getUser().getId());
        return ResponseEntity.ok(Map.of("message", "Report submitted.", "reportId", id));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<?> validateReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        submissionService.validateReport(id, userDetails.getUser().getId());
        return ResponseEntity.ok(Map.of("message", "Report validated.", "reportId", id));
    }

    @PostMapping("/{id}/finalize")
    public ResponseEntity<?> finalizeReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        submissionService.finalizeReport(id, userDetails.getUser().getId());
        return ResponseEntity.ok(Map.of("message", "Report finalized.", "reportId", id));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<?> archiveReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        ReportInstance archived = submissionService.archiveReport(id, userDetails.getUser().getId());
        return ResponseEntity.ok(Map.of(
                "message", "Report archived successfully.",
                "reportId", id,
                "contentHash", archived.getContentHash(),
                "pdfStorageKey", archived.getPdfStorageKey()
        ));
    }

    // ── PDF Export ────────────────────────────────────────────────────────────

    @PostMapping("/{id}/regenerate-pdf")
    @PreAuthorize("@reportSecurity.canGenerate(authentication, #id)")
    public ResponseEntity<?> regenerateOfficialPdf(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean force,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        try {
            submissionService.generateOfficialPdf(id, force, userDetails.getUser().getId());
            return ResponseEntity.ok(Map.of("message", "Official PDF generation started."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "FAILED", "reason", "PDF_GENERATION_ERROR", "details", e.getMessage()));
        }
    }

    @GetMapping("/{id}/pdf/draft")
    @PreAuthorize("@reportSecurity.canEdit(authentication, #id)")
    public ResponseEntity<byte[]> exportDraftPdf(@PathVariable UUID id) {
        byte[] pdfBytes = submissionService.exportDraftPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"draft-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("@reportSecurity.canDownload(authentication, #id)")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID id) {
        ReportInstance report = reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found: " + id));

        if (report.getPdfStorageKey() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("PDF not yet generated.".getBytes());
        }

        byte[] pdfBytes = fileStorageService.download("reports", report.getPdfStorageKey());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<ReportAuditLog>> getAuditTrail(@PathVariable UUID id) {
        return ResponseEntity.ok(auditLogService.getAuditTrail(id));
    }

    // ── Legacy & read endpoints ───────────────────────────────────────────────

    @PostMapping("/submit")
    public ResponseEntity<?> legacySubmit(
            @Valid @RequestBody ReportSubmitRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        submissionService.submitReport(request, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body("Report submitted successfully.");
    }

    @GetMapping
    public ResponseEntity<List<ReportInstance>> getAll() {
        return ResponseEntity.ok(reportRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportInstance> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found")));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ReportInstance>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(reportRepository.findByWorkflowStatus(status));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ReportInstance>> getMyReports(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportRepository.findByFilledBy(userDetails.getUser().getId()));
    }

    @GetMapping("/dashboard/summary")
    public ResponseEntity<?> getDashboardSummary() {
        long total = reportRepository.count();
        long draft = reportRepository.findByWorkflowStatus("DRAFT").size();
        long submitted = reportRepository.findByWorkflowStatus("SUBMITTED").size();
        long validated = reportRepository.findByWorkflowStatus("VALIDATED").size();
        long finalized = reportRepository.findByWorkflowStatus("FINALIZED").size();
        long archived = reportRepository.findByWorkflowStatus("ARCHIVED").size();

        return ResponseEntity.ok(Map.of(
                "totalReports", total,
                "draft", draft,
                "pendingValidation", submitted,
                "validated", validated,
                "finalized", finalized,
                "archived", archived));
    }
}
