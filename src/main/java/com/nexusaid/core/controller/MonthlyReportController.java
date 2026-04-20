package com.nexusaid.core.controller;

import com.nexusaid.core.entity.MonthlyReport;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.MonthlyReportService;
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
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MonthlyReport>> getReportsByCommittee(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(reportService.getReportsByCommittee(committeeId));
    }

    @GetMapping("/my-reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MonthlyReport>> getMyReports(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.getReportsByResponsible(userDetails.getUser().getId()));
    }

    @PostMapping("/monthly")
    @PreAuthorize("hasAnyRole('RESP_SECOURISME', 'RESP_JEUNESSE', 'RESP_SANTE') or hasRole('ADMIN')")
    public ResponseEntity<MonthlyReport> createDraft(
            @RequestBody MonthlyReport request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.createDraft(request, userDetails.getUser().getId()));
    }

    @PostMapping("/{reportId}/validate")
    @PreAuthorize("hasRole('SECRETAIRE_GENERAL') or hasRole('ADMIN')")
    public ResponseEntity<MonthlyReport> validateReport(
            @PathVariable UUID reportId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.validateReport(reportId, userDetails.getUser().getId()));
    }

    @PostMapping("/{reportId}/finalize")
    @PreAuthorize("hasRole('PRESIDENT') or hasRole('ADMIN')")
    public ResponseEntity<MonthlyReport> finalizeReport(
            @PathVariable UUID reportId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(reportService.finalizeReport(reportId, userDetails.getUser().getId()));
    }
}
