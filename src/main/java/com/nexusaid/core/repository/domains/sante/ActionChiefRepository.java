package com.nexusaid.core.repository.domains.sante;

import com.nexusaid.core.entity.domains.sante.ActionChief;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActionChiefRepository extends JpaRepository<ActionChief, UUID> {
    List<ActionChief> findByHealthActionId(UUID healthActionId);
    List<ActionChief> findByVolunteerId(UUID volunteerId);
}
