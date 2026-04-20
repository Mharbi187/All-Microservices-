package com.nexusaid.core.controller.domains.immigration;

import com.nexusaid.core.entity.domains.immigration.FamilyLinkCase;
import com.nexusaid.core.entity.domains.immigration.IntegrationTracking;
import com.nexusaid.core.entity.domains.immigration.MigrantCase;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.immigration.ImmigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/immigration")
@RequiredArgsConstructor
public class ImmigrationController {

    private final ImmigrationService immigrationService;
    private final JwtService jwtService;

    // ----- Migrant Cases -----

    @PostMapping("/cases")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<MigrantCase> registerMigrantCase(
            @RequestHeader("Authorization") String token,
            @RequestBody MigrantCase migrantCase) {
        
        UUID volunteerId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(immigrationService.registerMigrantCase(migrantCase, volunteerId));
    }

    @GetMapping("/cases")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<List<MigrantCase>> getAllMigrantCases() {
        return ResponseEntity.ok(immigrationService.getAllMigrantCases());
    }

    // ----- Family Links (RLF) -----

    @PostMapping("/family-links")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<FamilyLinkCase> openFamilyLinkCase(
            @RequestHeader("Authorization") String token,
            @RequestBody FamilyLinkCase linkCase) {
        
        UUID requesterId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(immigrationService.openFamilyLinkCase(linkCase, requesterId));
    }

    @GetMapping("/family-links")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<List<FamilyLinkCase>> getAllFamilyLinkCases() {
        return ResponseEntity.ok(immigrationService.getAllFamilyLinkCases());
    }

    @PutMapping("/family-links/{caseId}/resolve")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<FamilyLinkCase> resolveFamilyLinkCase(
            @PathVariable UUID caseId,
            @RequestBody String resolutionNotes) {
        return ResponseEntity.ok(immigrationService.resolveFamilyLinkCase(caseId, resolutionNotes));
    }

    // ----- Integration Tracking -----

    @GetMapping("/tracking/{migrantCaseId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<IntegrationTracking> getTracking(@PathVariable UUID migrantCaseId) {
        return immigrationService.getTracking(migrantCaseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tracking/{migrantCaseId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_IMMIGRATION')")
    public ResponseEntity<IntegrationTracking> updateTracking(
            @PathVariable UUID migrantCaseId,
            @RequestBody IntegrationTracking tracking) {
        return ResponseEntity.ok(immigrationService.updateTracking(migrantCaseId, tracking));
    }
}
