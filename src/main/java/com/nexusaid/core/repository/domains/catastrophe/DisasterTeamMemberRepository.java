package com.nexusaid.core.repository.domains.catastrophe;

import com.nexusaid.core.entity.domains.catastrophe.DisasterTeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DisasterTeamMemberRepository extends JpaRepository<DisasterTeamMember, UUID> {
    List<DisasterTeamMember> findByTeamType(String teamType);
    Optional<DisasterTeamMember> findByVolunteerId(UUID volunteerId);
}
