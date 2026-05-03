package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.ReportAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportAuditLogRepository extends JpaRepository<ReportAuditLog, UUID> {

    List<ReportAuditLog> findByReportIdOrderByPerformedAtAsc(UUID reportId);
}
