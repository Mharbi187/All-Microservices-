package com.nexusaid.core.repository.domains.secourisme;

import com.nexusaid.core.entity.domains.secourisme.RescueDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RescueDeviceRepository extends JpaRepository<RescueDevice, UUID> {
    List<RescueDevice> findByCommitteeId(UUID committeeId);
}
