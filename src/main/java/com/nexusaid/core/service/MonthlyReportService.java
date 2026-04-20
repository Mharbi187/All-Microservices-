package com.nexusaid.core.service;

import com.nexusaid.core.entity.MonthlyReport;
import com.nexusaid.core.entity.enums.MonthlyReportStatus;
import com.nexusaid.core.repository.MonthlyReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MonthlyReportService {

    private final MonthlyReportRepository reportRepository;

    public List<MonthlyReport> getReportsByCommittee(UUID committeeId) {
        return reportRepository.findByCommitteeId(committeeId);
    }

    public List<MonthlyReport> getReportsByResponsible(UUID responsibleId) {
        return reportRepository.findByResponsibleId(responsibleId);
    }

    @Transactional
    public MonthlyReport createDraft(MonthlyReport request, UUID responsibleId) {
        request.setResponsibleId(responsibleId);
        request.setStatus(MonthlyReportStatus.DRAFT);
        return reportRepository.save(request);
    }

    @Transactional
    public MonthlyReport validateReport(UUID reportId, UUID validatorId) {
        MonthlyReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        if (report.getStatus() != MonthlyReportStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT reports can be validated");
        }

        report.setStatus(MonthlyReportStatus.VALIDATED);
        report.setValidatedBy(validatorId);
        report.setValidatedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }

    @Transactional
    public MonthlyReport finalizeReport(UUID reportId, UUID finalizerId) {
        MonthlyReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        if (report.getStatus() != MonthlyReportStatus.VALIDATED) {
            throw new RuntimeException("Only VALIDATED reports can be finalized");
        }

        report.setStatus(MonthlyReportStatus.FINALIZED);
        report.setFinalizedBy(finalizerId);
        report.setFinalizedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }
}
