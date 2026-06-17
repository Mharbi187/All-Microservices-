package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Intervention;
import com.nexusaid.core.entity.enums.InterventionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InterventionRepository extends JpaRepository<Intervention, UUID> {
    List<Intervention> findByCommitteeId(UUID committeeId);

    List<Intervention> findByStatus(InterventionStatus status);

    List<Intervention> findByResponsibleId(UUID responsibleId);
}
