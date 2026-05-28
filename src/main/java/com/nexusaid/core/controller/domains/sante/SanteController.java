package com.nexusaid.core.controller.domains.sante;

import com.nexusaid.core.entity.domains.sante.*;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.sante.SanteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sante")
@RequiredArgsConstructor
public class SanteController {

    private final SanteService santeService;
    private final JwtService jwtService;

    // ----- Health Actions -----

    @PostMapping("/committees/{committeeId}/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<HealthAction> createAction(
            @PathVariable UUID committeeId,
            @RequestBody HealthAction action) {
        return ResponseEntity.ok(santeService.createAction(committeeId, action));
    }

    @GetMapping("/committees/{committeeId}/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<List<HealthAction>> getActions(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(santeService.getActionsForCommittee(committeeId));
    }

    // ----- Blood Donations -----

    @PostMapping("/blood-donations")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<BloodDonation> recordBloodDonation(@RequestBody BloodDonation donation) {
        return ResponseEntity.ok(santeService.recordBloodDonation(donation));
    }

    @GetMapping("/blood-donations")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<List<BloodDonation>> getAllBloodDonations() {
        return ResponseEntity.ok(santeService.getAllBloodDonations());
    }

    @GetMapping("/blood-donations/committee/{committeeId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<List<BloodDonation>> getBloodDonationsByCommittee(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(santeService.getBloodDonationsByCommittee(committeeId));
    }

    // ----- Beneficiary Health Files -----

    @PostMapping("/health-files")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<BeneficiaryHealthFile> addHealthFile(@RequestBody BeneficiaryHealthFile file) {
        return ResponseEntity.ok(santeService.addHealthFile(file));
    }

    @GetMapping("/health-files/intervention/{interventionId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<List<BeneficiaryHealthFile>> getHealthFilesForIntervention(@PathVariable UUID interventionId) {
        return ResponseEntity.ok(santeService.getHealthFilesForIntervention(interventionId));
    }

    // ----- Action Chiefs -----

    @PostMapping("/action-chiefs")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<ActionChief> assignActionChief(
            @RequestHeader("Authorization") String token,
            @RequestBody ActionChief chief) {
        UUID assignerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(santeService.assignActionChief(chief, assignerId));
    }

    // ----- Medical Distributions -----

    @PostMapping("/distributions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<MedicalDistribution> createDistribution(
            @RequestHeader("Authorization") String token,
            @RequestBody MedicalDistribution distribution) {
        UUID requestedBy = jwtService.extractUserId(token.substring(7));
        distribution.setRequestedBy(requestedBy);
        return ResponseEntity.ok(santeService.createDistribution(distribution));
    }

    @GetMapping("/distributions/committee/{committeeId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<List<MedicalDistribution>> getDistributionsByCommittee(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(santeService.getDistributionsByCommittee(committeeId));
    }

    @GetMapping("/distributions/pending")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<List<MedicalDistribution>> getPendingDistributions() {
        return ResponseEntity.ok(santeService.getPendingDistributions());
    }

    @GetMapping("/distributions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<List<MedicalDistribution>> getAllDistributions() {
        return ResponseEntity.ok(santeService.getAllDistributions());
    }

    @PutMapping("/distributions/{id}/approve")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<MedicalDistribution> approveDistribution(
            @PathVariable UUID id,
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false, defaultValue = "") String approvedByName) {
        UUID approvedBy = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(santeService.approveDistribution(id, approvedBy, approvedByName));
    }

    @PutMapping("/distributions/{id}/reject")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<MedicalDistribution> rejectDistribution(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "") String reason) {
        return ResponseEntity.ok(santeService.rejectDistribution(id, reason));
    }

    @PutMapping("/distributions/{id}/distribute")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL')")
    public ResponseEntity<MedicalDistribution> markDistributed(@PathVariable UUID id) {
        return ResponseEntity.ok(santeService.markDistributed(id));
    }
}
