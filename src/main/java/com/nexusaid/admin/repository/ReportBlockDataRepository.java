package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.ReportBlockData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportBlockDataRepository extends JpaRepository<ReportBlockData, UUID> {
    List<ReportBlockData> findByReportId(UUID reportId);
}
