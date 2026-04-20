package com.nexusaid.core.controller.domains.vff;

import com.nexusaid.core.entity.domains.vff.ProtectionCampaign;
import com.nexusaid.core.entity.domains.vff.VictimCase;
import com.nexusaid.core.entity.domains.vff.VictimSupportPath;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.vff.VffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vff")
@RequiredArgsConstructor
public class VffController {

    private final VffService vffService;
    private final JwtService jwtService;

    // ----- Victim Cases -----

    @PostMapping("/cases")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<VictimCase> reportCase(
            @RequestHeader("Authorization") String token,
            @RequestBody VictimCase victimCase) {
        
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(vffService.reportVictimCase(victimCase, volunteerId));
    }

    @GetMapping("/cases")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<List<VictimCase>> getAllCases() {
        return ResponseEntity.ok(vffService.getAllCases());
    }

    // ----- Support Paths -----

    @PostMapping("/support-paths/{caseId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<VictimSupportPath> createSupportPath(
            @PathVariable UUID caseId,
            @RequestBody VictimSupportPath supportPath) {
        return ResponseEntity.ok(vffService.initializeSupportPath(caseId, supportPath));
    }

    @PutMapping("/support-paths/{caseId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<VictimSupportPath> updateSupportPath(
            @PathVariable UUID caseId,
            @RequestBody VictimSupportPath updates) {
        return ResponseEntity.ok(vffService.updateSupportPath(caseId, updates));
    }

    @GetMapping("/support-paths/{caseId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<VictimSupportPath> getSupportPath(@PathVariable UUID caseId) {
        return vffService.getSupportPath(caseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ----- Protection Campaigns -----

    @PostMapping("/campaigns")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<ProtectionCampaign> launchCampaign(@RequestBody ProtectionCampaign campaign) {
        return ResponseEntity.ok(vffService.launchCampaign(campaign));
    }

    @GetMapping("/campaigns")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_VFF')")
    public ResponseEntity<List<ProtectionCampaign>> getAllCampaigns() {
        return ResponseEntity.ok(vffService.getAllCampaigns());
    }
}
