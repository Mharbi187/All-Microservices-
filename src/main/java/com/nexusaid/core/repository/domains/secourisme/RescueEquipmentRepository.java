package com.nexusaid.core.repository.domains.secourisme;

import com.nexusaid.core.entity.domains.secourisme.RescueEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RescueEquipmentRepository extends JpaRepository<RescueEquipment, UUID> {
    List<RescueEquipment> findByAssignedToCommitteeId(UUID committeeId);
}
