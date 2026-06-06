package com.nexusaid.core.repository.domains.catastrophe;

import com.nexusaid.core.entity.domains.catastrophe.DisasterFieldReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DisasterFieldReportRepository extends JpaRepository<DisasterFieldReport, UUID> {

    List<DisasterFieldReport> findByMissionId(UUID missionId);

    List<DisasterFieldReport> findByVolunteerId(UUID volunteerId);

    List<DisasterFieldReport> findByMissionIdAndVolunteerId(UUID missionId, UUID volunteerId);

    List<DisasterFieldReport> findByStatus(String status);
}
