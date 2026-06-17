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
    @Query("SELECT DISTINCT r FROM ReportInstance r LEFT JOIN FETCH r.template LEFT JOIN FETCH r.templateVersion LEFT JOIN FETCH r.assignedUsers WHERE r.filledBy = :filledBy")
    List<ReportInstance> findByFilledBy(@Param("filledBy") UUID filledBy);

    @Query("SELECT DISTINCT r FROM ReportInstance r LEFT JOIN FETCH r.template LEFT JOIN FETCH r.templateVersion LEFT JOIN FETCH r.assignedUsers WHERE r.template.id = :templateId")
    List<ReportInstance> findByTemplateId(@Param("templateId") UUID templateId);

    @Query("SELECT DISTINCT r FROM ReportInstance r LEFT JOIN FETCH r.template LEFT JOIN FETCH r.templateVersion LEFT JOIN FETCH r.assignedUsers WHERE r.workflowStatus = :workflowStatus")
    List<ReportInstance> findByWorkflowStatus(@Param("workflowStatus") String workflowStatus);

    @Query("SELECT DISTINCT r FROM ReportInstance r LEFT JOIN FETCH r.template LEFT JOIN FETCH r.templateVersion LEFT JOIN FETCH r.assignedUsers u WHERE u = :userId")
    List<ReportInstance> findByAssignedUsersContaining(@Param("userId") UUID userId);

    /**
     * Eagerly fetches templateVersion and assignedUsers to avoid LazyInitializationException.
     */
    @Query("SELECT DISTINCT r FROM ReportInstance r LEFT JOIN FETCH r.template LEFT JOIN FETCH r.templateVersion LEFT JOIN FETCH r.assignedUsers WHERE r.id = :id")
    List<ReportInstance> findByIdWithVersion(@Param("id") UUID id);
}
