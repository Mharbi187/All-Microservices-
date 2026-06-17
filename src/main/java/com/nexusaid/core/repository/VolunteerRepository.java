package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VolunteerRepository extends JpaRepository<Volunteer, UUID> {
    Optional<Volunteer> findByMatricule(String matricule);
    List<Volunteer> findByCommitteeIdAndAccountStatus(UUID committeeId, AccountStatus accountStatus);
    List<Volunteer> findByCommitteeId(UUID committeeId);
    List<Volunteer> findByCommitteeIdInAndAccountStatus(List<UUID> committeeIds, AccountStatus accountStatus);
}
