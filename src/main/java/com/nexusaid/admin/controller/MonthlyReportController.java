package com.nexusaid.admin.controller;

import com.nexusaid.admin.entity.MonthlyReport;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.MonthlyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class MonthlyReportController {

    private final MonthlyReportService reportService;

    @GetMapping("/committee/{committeeId}")
    public ResponseEntity<List<MonthlyReport>> getCommitteeReports(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(reportService.getReportsByCommittee(committeeId));
    }

    @GetMapping
    public ResponseEntity<List<MonthlyReport>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @PostMapping("/monthly")
    @PreAuthorize("hasAnyRole('RESP_SECOURISME', 'RESP_SANTE', 'RESP_JEUNESSE', 'RESP_ACTION_SOCIALE', 'RESP_DIFFUSION', 'RESP_IMMIGRATION', 'RESP_VFF')")
    public ResponseEntity<MonthlyReport> createDraft(
            @RequestBody MonthlyReport report,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.createDraft(report, userDetails.getUser().getId()));
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('SECRETAIRE_GENERAL')")
    public ResponseEntity<MonthlyReport> validateReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.validateReport(id, userDetails.getUser().getId()));
    }

    @PostMapping("/{id}/finalize")
    @PreAuthorize("hasRole('PRESIDENT')")
    public ResponseEntity<MonthlyReport> finalizeReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.finalizeReport(id, userDetails.getUser().getId()));
    }
}
