package com.nexusaid.core.controller.domains.sante;

import com.nexusaid.core.entity.domains.sante.ActionChief;
import com.nexusaid.core.entity.domains.sante.BeneficiaryHealthFile;
import com.nexusaid.core.entity.domains.sante.BloodDonation;
import com.nexusaid.core.entity.domains.sante.HealthAction;
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

    // ----- Health Actions (Campagnes de santé) -----

    @PostMapping("/committees/{committeeId}/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<HealthAction> createAction(
            @PathVariable UUID committeeId,
            @RequestBody HealthAction action) {
        return ResponseEntity.ok(santeService.createAction(committeeId, action));
    }

    @GetMapping("/committees/{committeeId}/actions")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<List<HealthAction>> getActions(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(santeService.getActionsForCommittee(committeeId));
    }

    // ----- Blood Donations -----

    @PostMapping("/blood-donations")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<BloodDonation> recordBloodDonation(@RequestBody BloodDonation donation) {
        return ResponseEntity.ok(santeService.recordBloodDonation(donation));
    }

    @GetMapping("/blood-donations")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<List<BloodDonation>> getAllBloodDonations() {
        return ResponseEntity.ok(santeService.getAllBloodDonations());
    }

    // ----- Beneficiary Health Files -----

    @PostMapping("/health-files")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<BeneficiaryHealthFile> addHealthFile(@RequestBody BeneficiaryHealthFile file) {
        return ResponseEntity.ok(santeService.addHealthFile(file));
    }

    @GetMapping("/health-files/intervention/{interventionId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<List<BeneficiaryHealthFile>> getHealthFilesForIntervention(@PathVariable UUID interventionId) {
        return ResponseEntity.ok(santeService.getHealthFilesForIntervention(interventionId));
    }

    // ----- Action Chiefs -----

    @PostMapping("/action-chiefs")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE')")
    public ResponseEntity<ActionChief> assignActionChief(
            @RequestHeader("Authorization") String token,
            @RequestBody ActionChief chief) {
        
        UUID assignerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(santeService.assignActionChief(chief, assignerId));
    }
}
