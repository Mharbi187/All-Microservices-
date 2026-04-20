package com.nexusaid.core.service.domains.secourisme;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.domains.secourisme.RescueDevice;
import com.nexusaid.core.entity.domains.secourisme.RescueEquipment;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.domains.secourisme.RescueDeviceRepository;
import com.nexusaid.core.repository.domains.secourisme.RescueEquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecourismeService {

    private final RescueDeviceRepository rescueDeviceRepository;
    private final RescueEquipmentRepository rescueEquipmentRepository;
    private final CommitteeRepository committeeRepository;

    @Transactional(readOnly = true)
    public List<RescueEquipment> getEquipmentForCommittee(UUID committeeId) {
        return rescueEquipmentRepository.findByAssignedToCommitteeId(committeeId);
    }

    @Transactional
    public RescueEquipment addEquipment(UUID committeeId, RescueEquipment equipment) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        equipment.setAssignedToCommittee(committee);
        return rescueEquipmentRepository.save(equipment);
    }

    @Transactional(readOnly = true)
    public List<RescueDevice> getDevicesForCommittee(UUID committeeId) {
        return rescueDeviceRepository.findByCommitteeId(committeeId);
    }

    @Transactional
    public RescueDevice addDevice(UUID committeeId, RescueDevice device) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        device.setCommittee(committee);
        device.setStatus("PLANNED");
        return rescueDeviceRepository.save(device);
    }
}
