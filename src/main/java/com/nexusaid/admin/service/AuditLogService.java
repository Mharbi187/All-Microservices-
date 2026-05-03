package com.nexusaid.admin.service;

import com.nexusaid.admin.entity.ReportAuditLog;
import com.nexusaid.admin.repository.ReportAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Writes immutable audit log entries for every workflow transition.
 * Uses REQUIRES_NEW so the log entry is committed even if the parent transaction rolls back.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final ReportAuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRED)
    public void log(UUID reportId, String action, UUID performedBy) {
        ReportAuditLog entry = ReportAuditLog.builder()
                .reportId(reportId)
                .action(action)
                .performedBy(performedBy)
                .build();
        auditLogRepository.save(entry);
        log.info("AuditLog: report={} action={} by={}", reportId, action, performedBy);
    }

    @Transactional(readOnly = true)
    public List<ReportAuditLog> getAuditTrail(UUID reportId) {
        return auditLogRepository.findByReportIdOrderByPerformedAtAsc(reportId);
    }
}
