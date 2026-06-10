package com.nexusaid.core.controller.domains.diffusion;

import com.nexusaid.core.entity.domains.diffusion.AwarenessCampaign;
import com.nexusaid.core.entity.domains.diffusion.EducationalResource;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.domains.diffusion.DiffusionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/diffusion")
@RequiredArgsConstructor
public class DiffusionController {

    private final DiffusionService diffusionService;
    private final JwtService jwtService;

    // ----- Educational Resources -----

    @GetMapping("/resources")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_DIFFUSION', 'VOLUNTEER', 'TRAINER')") // Visible to more people
    public ResponseEntity<List<EducationalResource>> getAllResources() {
        return ResponseEntity.ok(diffusionService.getAllResources());
    }

    @PostMapping("/resources")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_DIFFUSION')")
    public ResponseEntity<EducationalResource> createResource(
            @RequestHeader("Authorization") String token,
            @RequestBody EducationalResource resource) {

        UUID userId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(diffusionService.createResource(resource, userId));
    }

    // ----- Awareness Campaigns -----

    @GetMapping("/campaigns")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_DIFFUSION')")
    public ResponseEntity<List<AwarenessCampaign>> getAllCampaigns() {
        return ResponseEntity.ok(diffusionService.getAllCampaigns());
    }

    @PostMapping("/campaigns")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_DIFFUSION')")
    public ResponseEntity<AwarenessCampaign> createCampaign(
            @RequestHeader("Authorization") String token,
            @RequestBody AwarenessCampaign campaign) {

        UUID userId = jwtService.extractUserId(token.substring(7));
        return ResponseEntity.ok(diffusionService.createCampaign(campaign, userId));
    }

    @PatchMapping("/campaigns/{id}/status")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<AwarenessCampaign> updateCampaignStatus(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> payload) {
        return ResponseEntity.ok(diffusionService.updateCampaignStatus(id, payload.get("status")));
    }

    @PatchMapping("/resources/{id}/status")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<EducationalResource> updateResourceStatus(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> payload) {
        return ResponseEntity.ok(diffusionService.updateResourceStatus(id, payload.get("status")));
    }
}
