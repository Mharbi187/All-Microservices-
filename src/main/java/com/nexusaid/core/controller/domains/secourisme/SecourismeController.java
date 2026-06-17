package com.nexusaid.core.controller.domains.secourisme;

import com.nexusaid.core.dto.RcpEvaluationDto;
import com.nexusaid.core.entity.domains.secourisme.RescueDevice;
import com.nexusaid.core.entity.domains.secourisme.RescueEquipment;
import com.nexusaid.core.service.domains.secourisme.RcpEvaluationService;
import com.nexusaid.core.service.domains.secourisme.SecourismeService;
import com.nexusaid.core.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/secourisme")
@RequiredArgsConstructor
public class SecourismeController {

    private final SecourismeService secourismeService;
    private final RcpEvaluationService rcpEvaluationService;
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

    // ----- RCP AI Evaluation Endpoints -----

    /**
     * Submit a new RCP evaluation — restricted to RESP_SECOURISME / TRAINER roles only.
     */
    @PostMapping("/rcp-evaluations")
    @PreAuthorize("hasAnyRole('RESP_SECOURISME', 'TRAINER', 'PRESIDENT', 'ADMIN')")
    public ResponseEntity<RcpEvaluationDto> createRcpEvaluation(
            @RequestBody RcpEvaluationDto dto,
            @RequestHeader("Authorization") String token) {
        UUID trainerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(rcpEvaluationService.create(dto, trainerId));
    }

    /**
     * Get all RCP evaluations submitted by the current trainer (my evaluations).
     */
    @GetMapping("/rcp-evaluations/my")
    @PreAuthorize("hasAnyRole('RESP_SECOURISME', 'TRAINER', 'PRESIDENT', 'ADMIN')")
    public ResponseEntity<List<RcpEvaluationDto>> getMyRcpEvaluations(
            @RequestHeader("Authorization") String token) {
        UUID trainerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(rcpEvaluationService.getByTrainer(trainerId));
    }

    /**
     * Get all RCP evaluations for a specific committee — for local managers.
     */
    @GetMapping("/committees/{committeeId}/rcp-evaluations")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SECOURISME', 'ADMIN')")
    public ResponseEntity<List<RcpEvaluationDto>> getCommitteeRcpEvaluations(
            @PathVariable UUID committeeId) {
        return ResponseEntity.ok(rcpEvaluationService.getByCommittee(committeeId));
    }

    /**
     * Get ALL RCP evaluations across all committees — national dashboard view.
     */
    @GetMapping("/rcp-evaluations/national")
    @PreAuthorize("hasAnyRole('PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'PRESIDENT', 'ADMIN')")
    public ResponseEntity<List<RcpEvaluationDto>> getAllRcpEvaluations() {
        return ResponseEntity.ok(rcpEvaluationService.getAllNational());
    }

    /**
     * Get aggregated statistics for national RCP dashboard.
     */
    @GetMapping("/rcp-evaluations/statistics")
    @PreAuthorize("hasAnyRole('PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'PRESIDENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getRcpStatistics() {
        return ResponseEntity.ok(rcpEvaluationService.getNationalStatistics());
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
