package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.ReportInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportInstanceRepository extends JpaRepository<ReportInstance, UUID> {
    List<ReportInstance> findByFilledBy(UUID filledBy);

    List<ReportInstance> findByTemplateId(UUID templateId);

    List<ReportInstance> findByWorkflowStatus(String workflowStatus);

    @Query("SELECT r FROM ReportInstance r JOIN r.assignedUsers u WHERE u = :userId")
    List<ReportInstance> findByAssignedUsersContaining(@Param("userId") UUID userId);

    /**
     * Eagerly fetches templateVersion (with its JSONB structure) so the mobile
     * client receives the form schema without triggering a LazyInitializationException.
     */
    @Query("SELECT r FROM ReportInstance r LEFT JOIN FETCH r.templateVersion WHERE r.id = :id")
    Optional<ReportInstance> findByIdWithVersion(@Param("id") UUID id);
}
