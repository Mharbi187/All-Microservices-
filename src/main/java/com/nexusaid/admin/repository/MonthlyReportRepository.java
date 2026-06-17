package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.MonthlyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MonthlyReportRepository extends JpaRepository<MonthlyReport, UUID> {
    List<MonthlyReport> findByCommitteeIdAndReportPeriod(UUID committeeId, LocalDate period);
    List<MonthlyReport> findByCommitteeId(UUID committeeId);
    List<MonthlyReport> findByResponsibleId(UUID responsibleId);
}
