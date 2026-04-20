package com.nexusaid.core.repository.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.YouthIntegrationForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface YouthIntegrationFormRepository extends JpaRepository<YouthIntegrationForm, UUID> {
    Optional<YouthIntegrationForm> findByVolunteerId(UUID volunteerId);
}
