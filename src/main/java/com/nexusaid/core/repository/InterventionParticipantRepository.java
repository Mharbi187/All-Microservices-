package com.nexusaid.core.repository;

import com.nexusaid.core.entity.InterventionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InterventionParticipantRepository extends JpaRepository<InterventionParticipant, UUID> {
    List<InterventionParticipant> findByInterventionId(UUID interventionId);

    List<InterventionParticipant> findByVolunteerId(UUID volunteerId);
}
