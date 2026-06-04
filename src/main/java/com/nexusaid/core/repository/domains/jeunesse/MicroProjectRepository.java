package com.nexusaid.core.repository.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.MicroProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MicroProjectRepository extends JpaRepository<MicroProject, UUID> {
    List<MicroProject> findByLeadVolunteerId(UUID leadVolunteerId);
    List<MicroProject> findByStatus(String status);
    List<MicroProject> findByCommitteeId(UUID committeeId);
    List<MicroProject> findByCommitteeIdAndStatus(UUID committeeId, String status);
    List<MicroProject> findByCommitteeIdIn(List<UUID> committeeIds);
    List<MicroProject> findByCommitteeIdInAndStatus(List<UUID> committeeIds, String status);
}
