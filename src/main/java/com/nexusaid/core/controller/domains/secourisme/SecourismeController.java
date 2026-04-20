package com.nexusaid.core.controller.domains.secourisme;

import com.nexusaid.core.entity.domains.secourisme.RescueDevice;
import com.nexusaid.core.entity.domains.secourisme.RescueEquipment;
import com.nexusaid.core.service.domains.secourisme.SecourismeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/secourisme")
@RequiredArgsConstructor
public class SecourismeController {

    private final SecourismeService secourismeService;

    // ----- Equipment Management -----

    @GetMapping("/committees/{committeeId}/equipment")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SECOURISME')")
    public ResponseEntity<List<RescueEquipment>> getEquipment(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(secourismeService.getEquipmentForCommittee(committeeId));
    }

    @PostMapping("/committees/{committeeId}/equipment")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SECOURISME')")
    public ResponseEntity<RescueEquipment> addEquipment(
            @PathVariable UUID committeeId,
            @RequestBody RescueEquipment equipment) {
        return ResponseEntity.ok(secourismeService.addEquipment(committeeId, equipment));
    }

    // ----- Rescue Devices (Dispositifs Prévisionnels) -----

    @GetMapping("/committees/{committeeId}/devices")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SECOURISME')")
    public ResponseEntity<List<RescueDevice>> getDevices(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(secourismeService.getDevicesForCommittee(committeeId));
    }

    @PostMapping("/committees/{committeeId}/devices")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SECOURISME')")
    public ResponseEntity<RescueDevice> addDevice(
            @PathVariable UUID committeeId,
            @RequestBody RescueDevice device) {
        return ResponseEntity.ok(secourismeService.addDevice(committeeId, device));
    }
}
