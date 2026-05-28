package com.nexusaid.core.controller.domains.secourisme;

import com.nexusaid.core.entity.domains.secourisme.RescueDevice;
import com.nexusaid.core.entity.domains.secourisme.RescueEquipment;
import com.nexusaid.core.service.domains.secourisme.SecourismeService;
import com.nexusaid.core.security.JwtService;
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
    private final JwtService jwtService;

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
            @RequestBody RescueDevice device,
            @RequestHeader("Authorization") String token) {
        UUID userId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(secourismeService.addDevice(committeeId, device, userId));
    }

    @PutMapping("/devices/{id}/approve")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'ADMIN')")
    public ResponseEntity<RescueDevice> approveDevice(
            @PathVariable UUID id,
            @RequestParam(required = false) String actionChiefName,
            @RequestParam String approvalStatus,
            @RequestHeader("Authorization") String token) {
        UUID userId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(secourismeService.approveDevice(id, actionChiefName, approvalStatus, userId));
    }

    // ----- Certifications and Trainings (Mock Endpoints) -----

    @GetMapping("/certifications/volunteer/{volunteerId}")
    public ResponseEntity<List<Object>> getVolunteerCertifications(@PathVariable UUID volunteerId) {
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/trainings")
    public ResponseEntity<List<Object>> getCommitteTrainings(@RequestParam("committeeId") UUID committeeId) {
        return ResponseEntity.ok(List.of());
    }
}
