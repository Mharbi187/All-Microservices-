package com.nexusaid.core.service.domains.secourisme;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.domains.secourisme.RescueDevice;
import com.nexusaid.core.entity.domains.secourisme.RescueEquipment;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.domains.secourisme.RescueDeviceRepository;
import com.nexusaid.core.repository.domains.secourisme.RescueEquipmentRepository;
import com.nexusaid.core.entity.CalendarEvent;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.CalendarEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecourismeService {

    private final RescueDeviceRepository rescueDeviceRepository;
    private final RescueEquipmentRepository rescueEquipmentRepository;
    private final CommitteeRepository committeeRepository;
    private final UserRepository userRepository;
    private final CalendarEventRepository eventRepository;

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
    public RescueDevice addDevice(UUID committeeId, RescueDevice device, UUID organizerId) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        device.setCommittee(committee);
        if (device.getStatus() == null) {
            device.setStatus("PLANNED");
        }
        if (device.getApprovalStatus() == null) {
            device.setApprovalStatus("PENDING");
        }
        
        RescueDevice saved = rescueDeviceRepository.save(device);
        
        if ("APPROVED".equals(saved.getApprovalStatus())) {
            saved.setStatus("ACTIVE");
            
            // Create a CalendarEvent automatically!
            User organizer = userRepository.findById(organizerId).orElse(null);
            
            String eventTimeStr = saved.getEventTime() != null ? saved.getEventTime() : "08:00";
            int hour = 8;
            int minute = 0;
            try {
                String[] parts = eventTimeStr.split(":");
                hour = Integer.parseInt(parts[0]);
                minute = Integer.parseInt(parts[1]);
            } catch (Exception ignored) {}

            OffsetDateTime startDate = saved.getEventDate().atTime(hour, minute).atOffset(java.time.ZoneOffset.UTC);
            OffsetDateTime endDate = saved.getEventDate().atTime(23, 59).atOffset(java.time.ZoneOffset.UTC);

            CalendarEvent event = CalendarEvent.builder()
                    .title("[DPS] " + saved.getEventName())
                    .description("Dispositif Prévisionnel de Secours. Chef d'action : " + saved.getActionChiefName() + 
                                 ". Volontaires requis : " + saved.getVolunteersCount())
                    .type("URGENCE")
                    .startDate(startDate)
                    .endDate(endDate)
                    .location(saved.getLocation())
                    .committee(saved.getCommittee())
                    .organizer(organizer)
                    .targetScope(com.nexusaid.core.entity.enums.CommitteeType.LOCAL)
                    .status("VALIDE")
                    .build();
            
            eventRepository.save(event);
            rescueDeviceRepository.save(saved);
        }
        
        return saved;
    }

    @Transactional
    public RescueDevice approveDevice(UUID deviceId, String actionChiefName, String approvalStatus, UUID organizerId) {
        RescueDevice device = rescueDeviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Rescue device not found"));
        
        device.setApprovalStatus(approvalStatus);
        if (actionChiefName != null && !actionChiefName.trim().isEmpty()) {
            device.setActionChiefName(actionChiefName);
        }
        
        if ("APPROVED".equals(approvalStatus)) {
            device.setStatus("ACTIVE");
            
            // Create a CalendarEvent automatically!
            User organizer = userRepository.findById(organizerId).orElse(null);
            
            String eventTimeStr = device.getEventTime() != null ? device.getEventTime() : "08:00";
            int hour = 8;
            int minute = 0;
            try {
                String[] parts = eventTimeStr.split(":");
                hour = Integer.parseInt(parts[0]);
                minute = Integer.parseInt(parts[1]);
            } catch (Exception ignored) {}

            OffsetDateTime startDate = device.getEventDate().atTime(hour, minute).atOffset(java.time.ZoneOffset.UTC);
            OffsetDateTime endDate = device.getEventDate().atTime(23, 59).atOffset(java.time.ZoneOffset.UTC);

            CalendarEvent event = CalendarEvent.builder()
                    .title("[DPS] " + device.getEventName())
                    .description("Dispositif Prévisionnel de Secours. Chef d'action : " + device.getActionChiefName() + 
                                 ". Volontaires requis : " + device.getVolunteersCount())
                    .type("URGENCE")
                    .startDate(startDate)
                    .endDate(endDate)
                    .location(device.getLocation())
                    .committee(device.getCommittee())
                    .organizer(organizer)
                    .targetScope(com.nexusaid.core.entity.enums.CommitteeType.LOCAL)
                    .status("VALIDE")
                    .build();
            
            eventRepository.save(event);
        } else if ("REJECTED".equals(approvalStatus)) {
            device.setStatus("CANCELLED");
        }
        
        return rescueDeviceRepository.save(device);
    }
}
