package com.nexusaid.core.repository;

import com.nexusaid.core.entity.VolunteerCertification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VolunteerCertificationRepository extends JpaRepository<VolunteerCertification, UUID> {
    List<VolunteerCertification> findByVolunteerId(UUID volunteerId);
    Optional<VolunteerCertification> findByVolunteerIdAndCertificationId(UUID volunteerId, UUID certificationId);
    boolean existsByVolunteerIdAndCertificationId(UUID volunteerId, UUID certId);
    List<VolunteerCertification> findByVolunteerIdAndStatus(UUID volunteerId, String status);
    long countByVolunteerId(UUID volunteerId);
}
