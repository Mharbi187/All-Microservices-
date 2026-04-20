package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.ReportSubmitRequest;
import com.nexusaid.admin.entity.ReportInstance;
import com.nexusaid.admin.repository.ReportInstanceRepository;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.ReportSubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportSubmissionService submissionService;
    private final ReportInstanceRepository reportRepository;

    @PostMapping("/submit")
    public ResponseEntity<?> submitReport(
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

    // CDC Workflow Step 2: Secrétaire Général validates
    @PostMapping("/{id}/validate")
    public ResponseEntity<?> validateReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        ReportInstance report = reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        if (!"SUBMITTED".equals(report.getWorkflowStatus())) {
            return ResponseEntity.badRequest().body("Report must be in SUBMITTED status to validate.");
        }

        report.setWorkflowStatus("VALIDATED");
        report.setValidatedBy(userDetails.getUser().getId());
        report.setValidatedAt(LocalDateTime.now());
        reportRepository.save(report);

        return ResponseEntity.ok(Map.of("message", "Report validated by Secrétaire Général.", "reportId", id));
    }

    // CDC Workflow Step 3: Président gives final visa
    @PostMapping("/{id}/finalize")
    public ResponseEntity<?> finalizeReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        ReportInstance report = reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        if (!"VALIDATED".equals(report.getWorkflowStatus())) {
            return ResponseEntity.badRequest().body("Report must be VALIDATED before finalization.");
        }

        report.setWorkflowStatus("FINALIZED");
        report.setFinalizedBy(userDetails.getUser().getId());
        report.setArchivedAt(LocalDateTime.now());
        reportRepository.save(report);

        return ResponseEntity.ok(Map.of("message", "Report finalized by Président (visa).", "reportId", id));
    }

    // Dashboard aggregation endpoint
    @GetMapping("/dashboard/summary")
    public ResponseEntity<?> getDashboardSummary() {
        long total = reportRepository.count();
        long submitted = reportRepository.findByWorkflowStatus("SUBMITTED").size();
        long validated = reportRepository.findByWorkflowStatus("VALIDATED").size();
        long finalized = reportRepository.findByWorkflowStatus("FINALIZED").size();

        return ResponseEntity.ok(Map.of(
                "totalReports", total,
                "pendingValidation", submitted,
                "validated", validated,
                "finalized", finalized));
    }
}
