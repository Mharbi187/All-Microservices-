package com.nexusaid.core.repository;

import com.nexusaid.core.entity.VolunteerExtendedProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VolunteerExtendedProfileRepository extends JpaRepository<VolunteerExtendedProfile, UUID> {

    Optional<VolunteerExtendedProfile> findByVolunteerId(UUID volunteerId);

    boolean existsByVolunteerId(UUID volunteerId);

    List<VolunteerExtendedProfile> findByProfileCompletedFalse();

    @Query("SELECT COUNT(p) FROM VolunteerExtendedProfile p WHERE p.profileCompleted = true")
    long countCompleted();

    @Query("SELECT COUNT(p) FROM VolunteerExtendedProfile p WHERE p.profileCompleted = false")
    long countIncomplete();

    @Query("SELECT AVG(p.profileCompletionScore) FROM VolunteerExtendedProfile p WHERE p.profileCompleted = true")
    Double averageCompletionScore();
}
